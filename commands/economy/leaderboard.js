const { createEmbed } = require('../../utils/embeds');
const { loadEconomy } = require('../../utils/economy');

module.exports = {
    data: { name: 'leaderboard', description: 'Economy leaderboard', usage: ',leaderboard' },
    aliases: ['lb', 'baltop'],
    cooldown: 10,
    async execute(message) {
        const data = loadEconomy();
        const users = Object.entries(data.users)
            .filter(([, u]) => (u.wallet + u.bank) > 0)
            .sort((a, b) => (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank))
            .slice(0, 15);

        if (!users.length) return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'No one has any money yet.' })] });

        const medals = ['🥇', '🥈', '🥉'];
        const leaderboard = users.map(([id, u], i) => {
            const medal = medals[i] || `**${i + 1}.**`;
            return `${medal} <@${id}> — **$${(u.wallet + u.bank).toLocaleString()}**`;
        }).join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Economy Leaderboard',
                description: leaderboard
            })]
        });
    }
};
