const { PermissionFlagsBits } = require('discord.js');
const { first, run, addHistory } = require('./database');
const { createEmbed, COLORS, ALERT } = require('./embeds');
const { EMOJIS } = require('./styles');
const { warn, approve, deny } = require('./context');
const { resolveMember } = require('./roleplay');
const { getGuildConfig } = require('./config');

const DM_COMMANDS = ['ban', 'kick', 'softban', 'strip', 'jail', 'mute'];

function prefix(message) {
    const cfg = getGuildConfig(message.guild.id);
    return (cfg && cfg.prefix) || ',';
}

function permissionName(permission) {
    if (typeof permission === 'string') {
        return permission.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    const entry = Object.entries(PermissionFlagsBits).find(([, value]) => value === permission);
    if (!entry) return String(permission);
    return entry[0].replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\b\w/g, char => char.toUpperCase());
}

async function needPerm(message, permission) {
    if (message.member.permissions.has(permission)) return true;
    const pretty = permissionName(permission);
    await message.reply({
        embeds: [{
            color: COLORS.warning,
            description: `${message.author}, you need the **${pretty}** permission to do that.`
        }]
    }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
    return false;
}

async function needBotPerm(message, permission) {
    const me = message.guild.members.me;
    if (me && me.permissions.has(permission)) return true;
    const pretty = permissionName(permission);
    await message.reply({
        embeds: [{
            color: COLORS.warning,
            description: `${message.author}, I need the **${pretty}** permission to do that.`
        }]
    }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
    return false;
}

function formatTimespan(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    if (total === 0) return '0 seconds';
    const units = [
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
        ['second', 1]
    ];
    const parts = [];
    let remaining = total;
    for (const [name, size] of units) {
        if (remaining < size) continue;
        const value = Math.floor(remaining / size);
        remaining -= value * size;
        parts.push(`${value} ${name}${value === 1 ? '' : 's'}`);
        if (parts.length === 2) break;
    }
    return parts.join(', ');
}

async function noStaff(message, value, commandName) {
    const member = await resolveMember(message, value);
    if (!member) {
        await warn(message, `Member **${value || ''}** couldn't be found`);
        return null;
    }

    const me = message.guild.members.me;
    const myTop = me ? me.roles.highest.position : 0;
    const targetTop = member.roles.highest.position;
    if (myTop <= targetTop) {
        await warn(message, `Bot can't manage **${value}**, he has a higher role than me`);
        return null;
    }

    if (DM_COMMANDS.includes(commandName)) {
        if (message.author.id === member.id && message.author.id === message.guild.ownerId) {
            await warn(message, "You can't execute this command on yourself");
            return null;
        }
    }

    if (message.author.id === message.guild.ownerId) return member;
    if (member.id === message.guild.ownerId) {
        await warn(message, "You can't punish the server owner");
        return null;
    }
    if (message.author.id === member.id) return member;
    if (message.author.roles.highest.position <= targetTop) {
        await warn(message, `You can't manage **${member}**`);
        return null;
    }
    return member;
}

function jailConfig(guildId) {
    return first('SELECT * FROM jail WHERE guild_id = ?', guildId);
}

async function requireJail(message) {
    if (await jailConfig(message.guild.id)) return true;
    await warn(message, `Jail is **not** configured\n> Use \`${prefix(message)}setjail\` to enable it`);
    return false;
}

function replaceTokens(text, member, extra = {}) {
    let out = String(text);
    const avatar = member && member.user
        ? member.user.displayAvatarURL({ size: 256 })
        : '';
    const pairs = {
        '{member}': member ? `${member}` : '',
        '{member.id}': member ? member.id : '',
        '{member.name}': member && member.user ? member.user.username : '',
        '{member.nick}': member ? (member.displayName || '') : '',
        '{member.display}': member ? (member.displayName || '') : '',
        '{member.mention}': member ? `${member}` : '',
        '{member.discriminator}': '0',
        '{member.avatar}': avatar,
        '{reason}': extra.reason !== undefined ? extra.reason : '',
        '{case.id}': extra.historyId !== undefined ? extra.historyId : '',
        '{duration}': extra.duration !== undefined ? extra.duration : '',
        '{time}': extra.duration !== undefined ? extra.duration : ''
    };
    for (const key of Object.keys(pairs)) out = out.split(key).join(pairs[key]);
    return out;
}

function toPayload(code) {
    if (!code) return null;
    try {
        const parsed = JSON.parse(code);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const payload = { embeds: [parsed] };
            if (parsed.content) {
                payload.content = parsed.content;
                delete parsed.content;
            }
            return payload;
        }
    } catch (err) {
        return { content: String(code) };
    }
    return { content: String(code) };
}

async function invokeMessage(message, commandName, member, extra) {
    const row = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, commandName);
    if (!row || !row.embed) return false;
    const payload = toPayload(replaceTokens(row.embed, member, extra));
    if (!payload) return false;
    await message.reply(payload).catch(() => {});
    return true;
}

async function invokeDm(member, guildId, commandName, extra) {
    const row = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', guildId, commandName);
    if (!row || !row.embed) return false;
    const payload = toPayload(replaceTokens(row.embed, member, extra));
    if (!payload) return false;
    await member.send(payload).catch(() => {});
    return true;
}

async function invokeChannel(channel, guildId, commandName, member, extra) {
    const row = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', guildId, commandName);
    if (!row || !row.embed) return false;
    const payload = toPayload(replaceTokens(row.embed, member, extra));
    if (!payload) return false;
    await channel.send(payload).catch(() => {});
    return true;
}

function insertCase(message, member, punishment, duration, reason, timestamp, appealId) {
    try {
        return addHistory(message.guild.id, member.id, message.author.id, punishment, reason, timestamp, duration, appealId);
    } catch (err) {
        return null;
    }
}

async function sendModLog(guild, entry) {
    try {
        const row = first('SELECT moderation FROM logging WHERE guild_id = ?', guild.id);
        if (!row || !row.moderation) return;
        let channel = guild.channels.cache.get(String(row.moderation)) || null;
        if (!channel && guild.threads) channel = guild.threads.cache.get(String(row.moderation)) || null;
        if (!channel) channel = await guild.fetchChannel(String(row.moderation)).catch(() => null);
        if (!channel) return;
        const me = guild.members.me;
        if (me && channel.permissionsFor && !channel.permissionsFor(me).sendMessages) return;

        const embed = createEmbed({
            color: COLORS.neutral,
            title: `${entry.punishment} #${entry.historyId}`,
            description: `${entry.user} got ${entry.description}`,
            author: {
                name: entry.user.username || entry.user.tag || 'Unknown',
                icon_url: entry.user.displayAvatarURL ? entry.user.displayAvatarURL({ size: 256 }) : undefined
            },
            fields: [
                { name: 'User', value: `**${entry.user.username || entry.user.tag}** (\`${entry.user.id}\`)`, inline: false },
                { name: 'Moderator', value: `**${entry.moderator.username || entry.moderator.tag}** (\`${entry.moderator.id}\`)`, inline: false },
                { name: 'Reason', value: entry.reason || 'N/A', inline: false }
            ],
            footer: { text: `Members: ${guild.memberCount} | ID: ${entry.user.id}` }
        });

        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
        return;
    }
}

async function confirm(message, question, onYes, onNo) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('confirm_no').setLabel('No').setStyle(ButtonStyle.Danger)
    );

    const sent = await message.reply({
        embeds: [warningEmbed(null, `${EMOJIS.WARNING} ${message.author}: ${question}`)],
        components: [row]
    });

    const collector = sent.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async i => {
        collector.stop();
        try {
            if (i.customId === 'confirm_yes') await onYes(i);
            else await onNo(i);
        } catch (err) {
            i.update({ components: [] }).catch(() => {});
        }
    });

    collector.on('end', () => {
        sent.edit({ components: [] }).catch(() => {});
    });

    return sent;
}

function splitReason(args, startIndex = 0) {
    const parts = args.slice(startIndex);
    const silent = parts.includes('--s');
    const reason = parts.filter(part => part !== '--s').join(' ').trim().slice(0, 128);
    return {
        reason: reason || 'No reason provided',
        silent,
        text: (reason || 'No reason provided').slice(0, 128)
    };
}

async function resolveUser(message, client, value) {
    if (!value) return message.author;
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const id = String(value).replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return client.users.fetch(id).catch(() => null);
    return null;
}

function caseId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

module.exports = {
    prefix,
    needPerm,
    needBotPerm,
    formatTimespan,
    noStaff,
    jailConfig,
    requireJail,
    replaceTokens,
    invokeMessage,
    invokeDm,
    invokeChannel,
    toPayload,
    insertCase,
    sendModLog,
    confirm,
    splitReason,
    resolveUser,
    caseId
};
