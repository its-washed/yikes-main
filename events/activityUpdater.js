const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { getGuildActivity } = require('../utils/activity');

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
}

function buildMessageLeaderboard(guild) {
    const activity = getGuildActivity(guild.id);
    const entries = Object.entries(activity)
        .map(([userId, data]) => ({ userId, messages: data.messages }))
        .filter(e => e.messages > 0)
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 20);

    const medals = ['🥇', '🥈', '🥉'];
    const list = entries.length
        ? entries.map((e, i) => `${medals[i] || `**${i + 1}.**`} <@${e.userId}> — **${e.messages.toLocaleString()}** messages`).join('\n')
        : 'No data yet.';

    return {
        color: 0x3498db,
        title: `${guild.name} — Message Leaderboard`,
        description: list,
        footer: { text: 'Updates every hour' },
        timestamp: new Date().toISOString()
    };
}

function buildVCLeaderboard(guild) {
    const activity = getGuildActivity(guild.id);
    const entries = Object.entries(activity)
        .map(([userId, data]) => {
            const total = data.vcTime + (data.lastVCJoin > 0 ? Date.now() - data.lastVCJoin : 0);
            return { userId, vcTime: total };
        })
        .filter(e => e.vcTime > 0)
        .sort((a, b) => b.vcTime - a.vcTime)
        .slice(0, 20);

    const medals = ['🥇', '🥈', '🥉'];
    const list = entries.length
        ? entries.map((e, i) => `${medals[i] || `**${i + 1}.**`} <@${e.userId}> — **${formatDuration(e.vcTime)}**`).join('\n')
        : 'No data yet.';

    return {
        color: 0x39ffb8,
        title: `${guild.name} — Voice Channel Leaderboard`,
        description: list,
        footer: { text: 'Updates every hour' },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        setInterval(async () => {
            for (const [, guild] of client.guilds.cache) {
                const config = getGuildConfig(guild.id);
                if (!config.activityChannels) continue;

                const { messageId, messageEmbedId, vcId, vcEmbedId } = config.activityChannels;

                if (messageId && messageEmbedId) {
                    const channel = guild.channels.cache.get(messageId);
                    if (channel) {
                        const msg = await channel.messages.fetch(messageEmbedId).catch(() => null);
                        if (msg) {
                            await msg.edit({ embeds: [buildMessageLeaderboard(guild)] }).catch(() => {});
                        }
                    }
                }

                if (vcId && vcEmbedId) {
                    const channel = guild.channels.cache.get(vcId);
                    if (channel) {
                        const msg = await channel.messages.fetch(vcEmbedId).catch(() => null);
                        if (msg) {
                            await msg.edit({ embeds: [buildVCLeaderboard(guild)] }).catch(() => {});
                        }
                    }
                }
            }
        }, 3600000);
    }
};
