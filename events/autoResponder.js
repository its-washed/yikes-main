const { Events } = require('discord.js');
const { query } = require('../utils/database');
const { altConvert, scriptPayload } = require('../utils/embedScript');

const lastTriggered = new Map();

function parseData(value) {
    try {
        const parsed = JSON.parse(value || null);
        if (parsed && typeof parsed === 'object') {
            return {
                users: Array.isArray(parsed.users) ? parsed.users.map(String) : [],
                channels: Array.isArray(parsed.channels) ? parsed.channels.map(String) : [],
                roles: Array.isArray(parsed.roles) ? parsed.roles.map(String) : []
            };
        }
    } catch (err) {}
    return { users: [], channels: [], roles: [] };
}

function checkPermissions(perms, message) {
    const userId = String(message.author.id);
    const channelId = String(message.channel.id);
    const memberRoles = message.member && message.member.roles && message.member.roles.cache
        ? message.member.roles.cache.map(role => String(role.id))
        : [];

    let allowPresent = false;
    let denyPresent = false;
    let allowMatched = false;
    let denyMatched = false;

    for (const row of perms) {
        const data = parseData(row.data);
        const matched = data.users.includes(userId) ||
            data.channels.includes(channelId) ||
            memberRoles.some(id => data.roles.includes(id));
        if (row.state === 'deny') {
            denyPresent = true;
            if (matched) denyMatched = true;
        } else if (row.state === 'allow') {
            allowPresent = true;
            if (matched) allowMatched = true;
        }
    }

    if (allowPresent && !denyPresent) return allowMatched;
    if (denyMatched) return false;
    if (allowPresent) return allowMatched;
    return true;
}

function memberReplacement(member, params) {
    if (!params || !member) return params;
    const nick = member.nickname || member.displayName || '';
    const avatar = typeof member.displayAvatarURL === 'function'
        ? member.displayAvatarURL({ dynamic: true })
        : (member.defaultAvatarURL || '');
    return params
        .replace(/\{member\.id\}/g, member.id)
        .replace(/\{member\.name\}/g, member.user?.username || member.displayName || '')
        .replace(/\{member\.nick\}/g, nick)
        .replace(/\{member\.display\}/g, member.displayName || '')
        .replace(/\{member\.mention\}/g, `<@${member.id}>`)
        .replace(/\{member\.discriminator\}/g, member.user?.discriminator || member.discriminator || '0')
        .replace(/\{member\.avatar\}/g, avatar);
}

async function sendResponse(message, row) {
    const member = message.mentions.first() || message.member || message.author;
    const payload = scriptPayload(altConvert(member, memberReplacement(member, row.response)));
    if (!payload.content && !payload.embeds) return;

    if (row.reply) {
        try {
            await message.reply({ ...payload, allowedMentions: { repliedUser: false } });
        } catch (err) {
            await message.channel.send(payload).catch(() => {});
        }
    } else {
        await message.channel.send(payload).catch(() => {});
    }
    if (row.delete) {
        await message.delete().catch(() => {});
    }
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (!message.guild || !message.author || message.author.bot) return;
        const now = Date.now() / 1000;
        const channelId = message.channel.id;
        if (now - (lastTriggered.get(channelId) || 0) < 2.5) return;
        lastTriggered.set(channelId, now);

        const rows = query('SELECT * FROM autoresponder WHERE guild_id = ?', message.guild.id);
        if (!rows.length) return;
        const content = (message.content || '').toLowerCase();

        for (const row of rows) {
            const trigger = String(row.trigger || '').toLowerCase();
            if (!trigger) continue;
            const perms = query('SELECT state, data FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ?', message.guild.id, row.trigger);
            if (!checkPermissions(perms, message)) continue;
            const matched = row.strict ? trigger === content : content.includes(trigger);
            if (!matched) continue;
            await sendResponse(message, row).catch(() => {});
        }
    }
};
