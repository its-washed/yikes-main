const { Events, PermissionFlagsBits } = require('discord.js');
const { query } = require('../utils/database');

const cooldowns = new Map();
const locks = new Map();

function parseReactions(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkCooldown(channelId) {
    const now = Date.now();
    let bucket = cooldowns.get(channelId);
    if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 6000 };
        cooldowns.set(channelId, bucket);
    }
    bucket.count++;
    return bucket.count > 4;
}

function withChannelLock(channelId, fn) {
    const prev = locks.get(channelId) || Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(channelId, next.catch(() => {}));
    return next;
}

function containsSequence(words, sequence) {
    if (!sequence.length) return false;
    for (let i = 0; i <= words.length - sequence.length; i++) {
        if (sequence.every((word, j) => words[i + j] === word)) return true;
    }
    return false;
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (!message.guild || !message.author || message.author.bot) return;
        const me = message.guild.members.me;
        if (!me || !me.permissions.has(PermissionFlagsBits.AddReactions)) return;

        const channelRows = query('SELECT * FROM autoreact_channel WHERE guild_id = ?', message.guild.id);
        if (channelRows.some(row => String(row.channel_id) === message.channel.id)) {
            if (message.channel.rateLimitPerUser) {
                for (const row of channelRows) {
                    if (String(row.channel_id) !== message.channel.id) continue;
                    for (const emoji of parseReactions(row.reactions)) {
                        try { await message.react(emoji); } catch (err) {}
                        await sleep(500);
                    }
                }
            } else {
                return;
            }
        }

        const rows = query('SELECT * FROM autoreact WHERE guild_id = ?', message.guild.id);
        if (!rows.length) return;
        const messageWords = (message.content || '').toLowerCase().split(/\s+/).filter(Boolean);

        for (const row of rows) {
            const triggerWords = String(row.trigger || '').toLowerCase().split(/\s+/).filter(Boolean);
            if (!containsSequence(messageWords, triggerWords)) continue;
            if (checkCooldown(message.channel.id)) return;
            await withChannelLock(message.channel.id, async () => {
                for (const emoji of parseReactions(row.reactions)) {
                    try { await message.react(emoji); } catch (err) {}
                    await sleep(500);
                }
            });
        }
    }
};
