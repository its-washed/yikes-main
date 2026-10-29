const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { humanizeTime } = require('../../utils/helpers');
const { COLORS, EMOJIS } = require('../../utils/styles');

function evelinaReply(message, text, emoji) {
    return message.reply({
        embeds: [{ color: COLORS.NEUTRAL, description: `${emoji || ''} ${message.author.mention}: ${text}` }]
    });
}

function resolveTarget(message, args) {
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const token = args[0];
    if (token && /^<@!?\d{17,20}>$/.test(token)) return message.mentions.members.first();
    return message.member;
}

module.exports = {
    data: { name: 'voicetrack', description: "Shows how long a users' been in a voice channel", usage: ',voicetrack [member] <enable|disable|reset|clear|enablemute|disablemute|leaderboard|globalleaderboard|leveling>' },
    aliases: ['vct', 'vt'],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'reset', 'clear', 'enablemute', 'disablemute', 'leaderboard', 'globalleaderboard', 'leveling'],
    subUsages: {
        enable: ',voicetrack enable',
        disable: ',voicetrack disable',
        reset: ',voicetrack reset',
        clear: ',voicetrack clear [member]',
        enablemute: ',voicetrack enablemute',
        disablemute: ',voicetrack disablemute',
        leaderboard: ',voicetrack leaderboard',
        globalleaderboard: ',voicetrack globalleaderboard',
        leveling: ',voicetrack leveling <enable|disable>'
    },
    execute: async (message, args, client) => {
        if (args.length && (message.mentions.members.first() || client.commands.has(args[0]) || client.aliases.has(args[0]))) {
            return sendCard(message, module.exports);
        }
        const member = resolveTarget(message, args);
        const res = first('SELECT total_time, mute_time FROM voicetrack WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        const settings = first('SELECT mute_track FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
        if (res && res.total_time > 0) {
            const total = Math.floor(res.total_time);
            const mute = Math.floor(res.mute_time || 0);
            const isSelf = member.id === message.author.id;
            const who = isSelf ? 'You have spent' : `**${member.displayName}** has spent`;
            let text = `${who} **${humanizeTime(total, true, 'HH-MM-SS')}** in voice channels on **${message.guild.name}**`;
            if (settings && settings.mute_track && mute) {
                text += ` with a mute time of **${humanizeTime(mute, true, 'HH-MM-SS')}**`;
            }
            return evelinaReply(message, text, '🎙️');
        }
        if (member.id === message.author.id) return warn(message, 'No voice records found on this server.');
        return warn(message, `No voice records found for **${member.displayName}** on this server.`);
    },
    subs: {
        enable: {
            aliases: [],
            data: { name: 'voicetrack enable', description: 'Enable the voice track feature for your guild', usage: ',voicetrack enable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const res = first('SELECT state FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (!res || res.state === false) {
                    run('INSERT INTO voicetrack_settings (guild_id, state) VALUES (?, TRUE) ON CONFLICT (guild_id) DO UPDATE SET state = TRUE', message.guild.id);
                    return approve(message, 'Voice tracking has been **enabled**');
                }
                return warn(message, 'Voice tracking is **already** enabled for this server');
            }
        },
        disable: {
            aliases: [],
            data: { name: 'voicetrack disable', description: 'Disable the voice track feature for your guild', usage: ',voicetrack disable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const res = first('SELECT state FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (res && res.state === true) {
                    run('UPDATE voicetrack_settings SET state = FALSE WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Voice tracking has been **disabled**');
                }
                return warn(message, 'Voice tracking is **not** enabled');
            }
        },
        reset: {
            aliases: [],
            data: { name: 'voicetrack reset', description: 'Reset the voicetracking system in your server', usage: ',voicetrack reset' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const res = first('SELECT * FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (!res) return warn(message, 'Voice tracking is **not** enabled');
                return confirm(message, 'Are you sure you want to **reset** the voice tracking feature?\n**THIS WILL DELETE ALL TRACKING DATA FROM USERS**',
                    async (i) => {
                        run('DELETE FROM voicetrack WHERE guild_id = ?', i.guild.id);
                        run('DELETE FROM voicetrack_settings WHERE guild_id = ?', i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.DENY} ${i.user.mention}: Cleared all voice trackings in your server` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Voicetracking reset got canceled` }], components: [] });
                    });
            }
        },
        clear: {
            aliases: ['c'],
            data: { name: 'voicetrack clear', description: 'Clear your voice tracking data for the current guild', usage: ',voicetrack clear [member]' },
            execute: async (message, args) => {
                const member = resolveTarget(message, args);
                const res = first('SELECT * FROM voicetrack WHERE user_id = ? AND guild_id = ?', member.id, message.guild.id);
                if (!res) return warn(message, 'There is **no data** saved for this user');
                return confirm(message, `Are you sure you want to **clear** ${member.toString()}'s voice tracking data?`,
                    async (i) => {
                        run('DELETE FROM voicetrack WHERE user_id = ? AND guild_id = ?', member.id, i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Cleared ${member.toString()} voice tracking data` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Voicetracking data clear got canceled` }], components: [] });
                    });
            }
        },
        enablemute: {
            aliases: [],
            data: { name: 'voicetrack enablemute', description: 'Enable the mute time tracking', usage: ',voicetrack enablemute' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const res = first('SELECT mute_track FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (!res || res.mute_track === false) {
                    run('UPDATE voicetrack_settings SET mute_track = TRUE WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Mute time tracking has been **enabled**');
                }
                return warn(message, 'Mute time tracking is **already** enabled for this server');
            }
        },
        disablemute: {
            aliases: [],
            data: { name: 'voicetrack disablemute', description: 'Disable the mute time tracking', usage: ',voicetrack disablemute' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const res = first('SELECT mute_track FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (res && res.mute_track === true) {
                    run('UPDATE voicetrack_settings SET mute_track = FALSE WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Mute time tracking has been **disabled**');
                }
                return warn(message, 'Mute time tracking is **not** enabled for this server');
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'voicetrack leaderboard', description: 'List the members with the most voice time', usage: ',voicetrack leaderboard' },
            execute: async (message) => {
                const res = first('SELECT state, mute_track FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                if (!res || res.state === false) return warn(message, 'Voice tracking is not enabled for this server.');
                const results = query('SELECT user_id, total_time, mute_time FROM voicetrack WHERE guild_id = ? ORDER BY total_time DESC', message.guild.id);
                if (!results.length) return warn(message, 'No voice records found on this server.');
                const lines = [];
                for (const record of results.slice(0, 50)) {
                    const user = message.client.users.cache.get(String(record.user_id));
                    if (!user) continue;
                    const total = Math.floor(record.total_time || 0);
                    const mute = Math.floor(record.mute_time || 0);
                    if (res.mute_track && mute) {
                        lines.push(`**${user.username}** - ${humanizeTime(total, true, 'HH-MM-SS')} (🔇 ${humanizeTime(mute, true, 'HH-MM-SS')})`);
                    } else {
                        lines.push(`**${user.username}** - ${humanizeTime(total, true, 'HH-MM-SS')}`);
                    }
                }
                return paginate(message, lines, 'Voice Time Leaderboard',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || message.client.user.displayAvatarURL() });
            }
        },
        globalleaderboard: {
            aliases: ['glb'],
            data: { name: 'voicetrack globalleaderboard', description: 'List the members with the most voice time over all servers', usage: ',voicetrack globalleaderboard' },
            execute: async (message) => {
                const results = query('SELECT user_id, SUM(total_time) AS total_time FROM voicetrack GROUP BY user_id ORDER BY total_time DESC');
                const lines = [];
                for (const record of results.slice(0, 50)) {
                    const user = message.client.users.cache.get(String(record.user_id))
                        || await message.client.users.fetch(String(record.user_id)).catch(() => null);
                    if (!user) continue;
                    lines.push(`**${user.username}** - ${humanizeTime(Math.floor(record.total_time || 0), true, 'HH-MM-SS')}`);
                }
                if (!lines.length) return warn(message, 'No voice records found');
                return paginate(message, lines, 'Global Voice Time Leaderboard',
                    { name: message.author.username, icon_url: message.author.displayAvatarURL() });
            }
        },
        leveling: {
            aliases: ['level'],
            data: { name: 'voicetrack leveling', description: 'Manage voice leveling', usage: ',voicetrack leveling <enable|disable>' },
            subcommands: ['enable', 'disable'],
            subUsages: {
                enable: ',voicetrack leveling enable',
                disable: ',voicetrack leveling disable'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.leveling);
            },
            subs: {
                enable: {
                    aliases: [],
                    data: { name: 'voicetrack leveling enable', description: 'Enable the voice leveling feature for your guild', usage: ',voicetrack leveling enable' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const res = first('SELECT level_state FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                        if (!res || res.level_state === false) {
                            run('INSERT INTO voicetrack_settings (guild_id, level_state) VALUES (?, TRUE) ON CONFLICT (guild_id) DO UPDATE SET level_state = TRUE', message.guild.id);
                            return approve(message, 'Voice leveling has been **enabled**');
                        }
                        return warn(message, 'Voice leveling is **already** enabled for this server');
                    }
                },
                disable: {
                    aliases: [],
                    data: { name: 'voicetrack leveling disable', description: 'Disable the voice leveling feature for your guild', usage: ',voicetrack leveling disable' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const res = first('SELECT level_state FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                        if (res && res.level_state === true) {
                            run('UPDATE voicetrack_settings SET level_state = FALSE WHERE guild_id = ?', message.guild.id);
                            return approve(message, 'Voice leveling has been **disabled**');
                        }
                        return warn(message, 'Voice leveling is **not** enabled');
                    }
                }
            }
        }
    }
};
