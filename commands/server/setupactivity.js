const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { getGuildActivity } = require('../../utils/activity');
const { PermissionFlagsBits } = require('discord.js');

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
        color: 0x2ecc71,
        title: `${guild.name} — Voice Channel Leaderboard`,
        description: list,
        footer: { text: 'Updates every hour' },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    data: { name: 'setupactivity', description: 'Create auto-updating activity leaderboard channels', usage: ',setupactivity' },
    aliases: ['setuplb', 'setupleaderboards'],
    cooldown: 30,
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need `Manage Channels` permission.')] });
        }

        const config = getGuildConfig(message.guild.id);
        if (config.activityChannels?.messageId || config.activityChannels?.vcId) {
            return message.reply({ embeds: [errorEmbed('Already Setup', 'Activity channels already exist. Use `,removeactivity` to remove them first.')] });
        }

        const msgChannel = await message.guild.channels.create({
            name: 'message-leaderboard',
            type: 0,
            topic: 'Top chatters — updates hourly'
        }).catch(() => null);

        const vcChannel = await message.guild.channels.create({
            name: 'vc-leaderboard',
            type: 0,
            topic: 'Top voice users — updates hourly'
        }).catch(() => null);

        if (!msgChannel || !vcChannel) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not create channels. Check my permissions.')] });
        }

        const msgEmbed = await msgChannel.send({ embeds: [buildMessageLeaderboard(message.guild)] }).catch(() => null);
        const vcEmbed = await vcChannel.send({ embeds: [buildVCLeaderboard(message.guild)] }).catch(() => null);

        updateGuildConfig(message.guild.id, {
            activityChannels: {
                messageId: msgChannel.id,
                messageEmbedId: msgEmbed?.id || null,
                vcId: vcChannel.id,
                vcEmbedId: vcEmbed?.id || null
            }
        });

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Activity Leaderboards Created!',
                description: `${msgChannel} — Message leaderboard\n${vcChannel} — Voice leaderboard\n\nBoth update **every hour**.`
            })]
        });
    }
};

module.exports.buildMessageLeaderboard = buildMessageLeaderboard;
module.exports.buildVCLeaderboard = buildVCLeaderboard;
