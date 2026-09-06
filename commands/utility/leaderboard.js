const { PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { getAllLevelData, resetLevelData } = require('../../utils/levels');

module.exports = {
    data: {
        name: 'leaderboard',
        description: 'Show server XP leaderboard',
        usage: ',leaderboard'
    },
    aliases: ['lb', 'top'],
    cooldown: 10,

    async execute(message, args, client) {
        const all = getAllLevelData(message.guild.id);
        const sorted = Object.entries(all)
            .sort((a, b) => (b[1].totalXp || 0) - (a[1].totalXp || 0))
            .slice(0, 20);

        if (sorted.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Leaderboard', description: 'No data yet. Start chatting to earn XP!' })] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const entries = sorted.map(([userId, data], i) => {
            const prefix = medals[i] || `**#${i + 1}**`;
            return `${prefix} <@${userId}> — Level **${data.level}** (${data.totalXp} XP)`;
        });

        return message.reply({
            embeds: [createEmbed({
                color: 0xffd700,
                title: `Leaderboard — ${message.guild.name}`,
                description: entries.join('\n')
            })]
        });
    }
};
