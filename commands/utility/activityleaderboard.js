const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getGuildActivity } = require('../../utils/activity');
const { Paginator } = require('../../utils/pagination');

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
}

module.exports = {
    data: { name: 'activityleaderboard', description: 'View activity leaderboards', usage: ',activityleaderboard <messages|vc>' },
    aliases: ['alb', 'actlb'],
    cooldown: 10,
    async execute(message, args) {
        const type = args[0]?.toLowerCase();
        if (!type || !['messages', 'vc'].includes(type)) {
            return message.reply({ embeds: [errorEmbed('Usage', ',activityleaderboard <messages|vc>')] });
        }

        const guildActivity = getGuildActivity(message.guild.id);
        const entries = Object.entries(guildActivity)
            .map(([userId, data]) => ({ userId, ...data }))
            .filter(e => type === 'messages' ? e.messages > 0 : e.vcTime > 0);

        if (!entries.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Activity Leaderboard', description: 'No data yet.' })] });
        }

        if (type === 'messages') {
            entries.sort((a, b) => b.messages - a.messages);
        } else {
            entries.sort((a, b) => b.vcTime - a.vcTime);
        }

        const top = entries.slice(0, 50);
        const medals = ['🥇', '🥈', '🥉'];

        const pages = [];
        for (let i = 0; i < top.length; i += 10) {
            const chunk = top.slice(i, i + 10);
            const list = chunk.map((e, j) => {
                const rank = medals[i + j] || `**${i + j + 1}.**`;
                const value = type === 'messages' ? `${e.messages.toLocaleString()} msgs` : formatDuration(e.vcTime);
                return `${rank} <@${e.userId}> — ${value}`;
            }).join('\n');

            pages.push({
                color: type === 'messages' ? 0x3498db : 0x2ecc71,
                title: type === 'messages' ? 'Message Leaderboard' : 'Voice Channel Leaderboard',
                description: list
            });
        }

        return new Paginator(pages, { userId: message.author.id }).start(message.channel);
    }
};
