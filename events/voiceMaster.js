const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../utils/database');
const { logger } = require('../utils/logger');
const { COLORS, EMOJIS } = require('../utils/styles');

async function notifyMissingPerms(member, action) {
    try {
        await member.send({
            embeds: [{
                color: COLORS.WARNING,
                description: `${EMOJIS.WARNING} ${member}: **${action.charAt(0).toUpperCase()}${action.slice(1)}** action failed because I lack the required permissions`
            }]
        });
    } catch (err) {}
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function categoryFull(member, category) {
    if (category && category.children && category.children.cache.size >= 50) {
        try {
            await member.voice.disconnect('Voice category is full');
        } catch (err) {}
        return true;
    }
    return false;
}

async function applyPresetToChannel(guild, member, channel, preset) {
    let settings;
    let overwrites;
    try {
        settings = JSON.parse(preset.settings) || {};
        overwrites = JSON.parse(preset.overwrites) || {};
    } catch (err) {
        return;
    }
    const userLimit = Number.isInteger(settings.user_limit) ? settings.user_limit : 0;
    try {
        await channel.edit({
            name: settings.name,
            bitrate: settings.bitrate,
            userLimit,
            reason: `Loaded preset for ${member.user.username}`
        });
        const payload = [];
        for (const [id, data] of Object.entries(overwrites)) {
            const target = data.type === 'role' ? guild.roles.cache.get(id) : guild.members.cache.get(id);
            if (target) payload.push({ id, type: data.type === 'role' ? 'role' : 'member', allow: BigInt(data.allow || 0), deny: BigInt(data.deny || 0) });
        }
        if (payload.length) await channel.edit({ permissionOverwrites: payload, reason: `Loaded preset for ${member.user.username}` });
    } catch (err) {
        await notifyMissingPerms(member, `load preset: ${err.message}`);
    }
}

async function createTemporaryChannel(member, category) {
    try {
        const cfg = first('SELECT * FROM voicemaster WHERE guild_id = ?', member.guild.id);
        let bitrate = cfg && cfg.bitrate ? cfg.bitrate : null;
        if (bitrate) {
            const limits = [96000, 128000, 256000];
            for (let tier = 0; tier < limits.length; tier++) {
                if ((member.guild.premiumTier || 0) < tier + 1 && bitrate > limits[tier]) {
                    bitrate = limits[tier];
                    break;
                }
            }
        }

        let name = cfg && cfg.name ? cfg.name : "{user.name}'s lounge";
        name = name
            .replace(/\{user\.display_name\}/g, member.displayName)
            .replace(/\{user\.name\}/g, member.user.username)
            .replace(/\{user\}/g, member.user.username);

        if (cfg && cfg.savesettings) {
            const saved = first('SELECT name FROM voicemaster_names WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
            if (saved && saved.name) name = saved.name;
        }

        const preset = first('SELECT * FROM voicemaster_presets WHERE user_id = ? AND autoload = 1', member.id);

        const overwrites = [];
        if (cfg && cfg.channel_id) {
            const jtc = member.guild.channels.cache.get(String(cfg.channel_id));
            if (jtc && jtc.permissionOverwrites) {
                for (const [id, ow] of jtc.permissionOverwrites.cache) {
                    overwrites.push({ id, allow: ow.allow.bitfield, deny: ow.deny.bitfield });
                }
            }
        }
        overwrites.push({
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers],
            deny: []
        });

        const channel = await member.guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category ? category.id : undefined,
            reason: 'creating temporary voice channel',
            permissionOverwrites: overwrites,
            rtcRegion: cfg && cfg.region ? cfg.region : null,
            bitrate: bitrate || undefined
        });

        if (member.voice && member.voice.channelId) {
            try {
                await member.voice.setChannel(channel);
                run('INSERT OR REPLACE INTO voicemaster_channels (user_id, voice) VALUES (?, ?)', member.id, channel.id);
            } catch (err) {
                await channel.delete({ reason: 'Member was not connected to a voice channel, so temporary channel is not needed' }).catch(() => {});
                return;
            }
        } else {
            await channel.delete({ reason: 'Member was not connected to a voice channel, so temporary channel is not needed' }).catch(() => {});
            return;
        }

        if (preset) await applyPresetToChannel(member.guild, member, channel, preset);

        await sleep(900);
        const refreshed = member.guild.channels.cache.get(channel.id);
        if (refreshed && refreshed.members.size === 0) {
            await refreshed.delete({ reason: 'No one inside the temporary voice channel' }).catch(() => {});
            run('DELETE FROM voicemaster_channels WHERE voice = ?', refreshed.id);
        }
    } catch (err) {
        if (err.code === 50013) await notifyMissingPerms(member, 'create temporary voice channel');
        else logger.error(`voicemaster err: ${err.message}`);
    }
}

async function deleteTemporaryChannel(channel) {
    const row = first('SELECT user_id FROM voicemaster_channels WHERE voice = ?', channel.id);
    if (!row) return;
    if (channel.members.size > 0) return;
    run('DELETE FROM voicemaster_channels WHERE voice = ?', channel.id);
    try {
        await channel.delete({ reason: 'no one in the temporary voice channel' });
    } catch (err) {
        if (err.code === 50013) {
            const owner = channel.guild.members.cache.get(String(row.user_id));
            if (owner) await notifyMissingPerms(owner, 'delete your voice channel');
        }
    }
}

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,

    async execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const me = newState.guild.members.me;
        if (!me || !me.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (oldState.channelId === newState.channelId) return;

        const cfg = first('SELECT * FROM voicemaster WHERE guild_id = ?', newState.guild.id);
        if (!cfg) return;
        const jtcId = String(cfg.channel_id);

        const beforeChannel = oldState.channel;
        const afterChannel = newState.channel;

        if (!beforeChannel && afterChannel) {
            if (afterChannel.id === jtcId) {
                if (await categoryFull(member, afterChannel.category)) return;
                const customCategory = cfg.category ? newState.guild.channels.cache.get(String(cfg.category)) : null;
                return createTemporaryChannel(member, customCategory || afterChannel.category);
            }
            return;
        }

        if (beforeChannel && afterChannel) {
            if (beforeChannel.id === jtcId) return;
            const sameCategory = (beforeChannel.category ? beforeChannel.category.id : null) === (afterChannel.category ? afterChannel.category.id : null);
            if (sameCategory) {
                if (afterChannel.id === jtcId) {
                    const owned = first('SELECT 1 AS ok FROM voicemaster_channels WHERE voice = ?', beforeChannel.id);
                    if (owned && beforeChannel.members.size === 0) {
                        try {
                            await member.voice.setChannel(beforeChannel);
                        } catch (err) {}
                        return;
                    }
                    if (await categoryFull(member, afterChannel.category)) return;
                    const customCategory = cfg.category ? newState.guild.channels.cache.get(String(cfg.category)) : null;
                    return createTemporaryChannel(member, customCategory || afterChannel.category);
                }
                if (beforeChannel.id !== afterChannel.id) {
                    return deleteTemporaryChannel(beforeChannel);
                }
                return;
            }
            if (afterChannel.id === jtcId) {
                if (await categoryFull(member, afterChannel.category)) return;
                const customCategory = cfg.category ? newState.guild.channels.cache.get(String(cfg.category)) : null;
                return createTemporaryChannel(member, customCategory || afterChannel.category);
            }
            return deleteTemporaryChannel(beforeChannel);
        }

        if (beforeChannel && !afterChannel) {
            if (beforeChannel.id === jtcId) return;
            return deleteTemporaryChannel(beforeChannel);
        }
    }
};
