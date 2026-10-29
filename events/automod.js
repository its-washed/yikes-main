const { Events, PermissionFlagsBits } = require('discord.js');
const { first, query } = require('../utils/database');
const { formatTimespan } = require('../utils/moderation');
const { EMOJIS } = require('../utils/styles');

const WINDOW = 10;
const COOLDOWN_MS = 30000;

const spamCache = new Map();
const repeatCache = new Map();
const cooldowns = new Map();

function whitelisted(row, message) {
    if (row.users) {
        try {
            const users = JSON.parse(row.users);
            if (Array.isArray(users) && users.map(String).includes(String(message.author.id))) return true;
        } catch (err) {}
    }
    if (row.channels) {
        try {
            const channels = JSON.parse(row.channels);
            if (Array.isArray(channels) && channels.map(String).includes(String(message.channel.id))) return true;
        } catch (err) {}
    }
    if (row.roles) {
        try {
            const roles = JSON.parse(row.roles);
            if (Array.isArray(roles) && message.member && message.member.roles.cache.some(role => roles.map(String).includes(String(role.id)))) return true;
        } catch (err) {}
    }
    return false;
}

function spamThreshold(guildId, userId) {
    const key = `${guildId}-${userId}`;
    const now = Date.now();
    const list = (spamCache.get(key) || []).filter(at => now - at < WINDOW * 1000);
    list.push(now);
    spamCache.set(key, list);
    return list.length;
}

function repeatThreshold(guildId, userId, content) {
    const key = `${guildId}-${userId}`;
    const now = Date.now();
    let data = repeatCache.get(key);
    if (!data) {
        data = { last: content, count: 1, at: now };
    } else if (data.last === content) {
        data.count += 1;
        data.at = now;
    } else {
        data.last = content;
        data.count = 1;
        data.at = now;
    }
    if (now - data.at > WINDOW * 1000) data.count = 1;
    repeatCache.set(key, data);
    return data.count;
}

async function purgeMessages(message) {
    const cached = message.client.channels.cache.get(message.channel.id);
    const target = cached || message.channel;
    try {
        const history = await target.messages.fetch({ limit: 100 });
        const mine = history
            .filter(msg => msg.author.id === message.author.id)
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .toArray();
        if (mine.length > 1) {
            await target.bulkDelete(mine.slice(1)).catch(() => {});
        }
    } catch (err) {}
}

async function enforce(message, mode) {
    const table = mode === 'spam' ? 'automod_spam' : 'automod_repeat';
    const label = mode === 'spam' ? 'spamming' : 'repeating';
    const cacheKey = mode === 'spam' ? 'antispam' : 'antirepeat';

    const row = first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
    if (!row) return;
    if (whitelisted(row, message)) return;

    const rate = Number(row.rate) || 8;
    const timeout = Number(row.timeout) || 0;
    const notify = Boolean(row.message);

    const count = mode === 'spam'
        ? spamThreshold(message.guild.id, message.author.id)
        : repeatThreshold(message.guild.id, message.author.id, message.content);
    if (count <= rate) return;

    const cooldownKey = `${cacheKey}-${message.author.id}`;
    const now = Date.now();
    if ((cooldowns.get(cooldownKey) || 0) > now) return;
    cooldowns.set(cooldownKey, now + COOLDOWN_MS);

    await purgeMessages(message);

    if (mode === 'spam') spamCache.delete(`${message.guild.id}-${message.author.id}`);
    else repeatCache.delete(`${message.guild.id}-${message.author.id}`);

    try {
        if (timeout > 0) {
            await message.member.timeout(timeout * 1000, mode === 'spam' ? 'Flagged by the antispam' : 'Flagged by antirepeat').catch(() => {});
            if (notify) {
                const sent = await message.channel.send({
                    embeds: [{
                        color: 0xffd600,
                        description: `> ${EMOJIS.WARNING} ${message.author} has been muted for **${formatTimespan(timeout)}** - ***${label} messages***`
                    }]
                }).catch(() => null);
                if (sent) setTimeout(() => sent.delete().catch(() => {}), 6000);
            }
        } else if (notify) {
            const sent = await message.channel.send({
                embeds: [{
                    color: 0xffd600,
                    description: `> ${EMOJIS.WARNING} ${message.author} has been flagged for ***${label} messages***`
                }]
            }).catch(() => null);
            if (sent) setTimeout(() => sent.delete().catch(() => {}), 6000);
        }
    } catch (err) {}
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;
        if (!message.member) return;
        if (message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

        const me = message.guild.members.me;
        if (!me) return;
        if (!me.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
        if (message.member.roles.highest && me.roles.highest && message.member.roles.highest.comparePositionTo(me.roles.highest) >= 0) return;

        try {
            const spamRow = first('SELECT 1 AS ok FROM automod_spam WHERE guild_id = ?', message.guild.id);
            if (spamRow) await enforce(message, 'spam');
            const repeatRow = first('SELECT 1 AS ok FROM automod_repeat WHERE guild_id = ?', message.guild.id);
            if (repeatRow) await enforce(message, 'repeat');
        } catch (err) {}
    }
};
