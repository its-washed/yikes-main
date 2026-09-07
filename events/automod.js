const { Events, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

const spamTracker = new Map();

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;
        const config = getGuildConfig(message.guild.id);
        if (!config.automod?.enabled) return;

        if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

        if (config.automod?.links && /https?:\/\/[^\s]+/i.test(message.content)) {
            try { await message.delete(); } catch {}
            const warn = await message.channel.send({
                embeds: [{ color: 0xffa502, description: `${message.author}, links are not allowed.` }]
            }).catch(() => {});
            if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
            return;
        }

        const words = config.automod?.words || [];
        const msgLower = message.content.toLowerCase();
        for (const word of words) {
            if (msgLower.includes(word)) {
                try { await message.delete(); } catch {}
                const warn = await message.channel.send({
                    embeds: [{ color: 0xffa502, description: `${message.author}, that word is blocked.` }]
                }).catch(() => {});
                if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
                return;
            }
        }

        if (config.automod?.spam) {
            const { threshold = 5, interval = 10 } = config.automod.spam;
            const key = `${message.guild.id}-${message.author.id}`;
            const now = Date.now();

            if (!spamTracker.has(key)) spamTracker.set(key, []);
            const times = spamTracker.get(key).filter(t => now - t < interval * 1000);
            times.push(now);
            spamTracker.set(key, times);

            if (times.length > threshold) {
                spamTracker.delete(key);
                try { await message.delete(); } catch {}
                const warn = await message.channel.send({
                    embeds: [{ color: 0xffa502, description: `${message.author}, please don't spam.` }]
                }).catch(() => {});
                if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
            }
        }
    }
};
