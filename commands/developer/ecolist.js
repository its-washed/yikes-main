const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { loadEconomy } = require('../../utils/economy');

module.exports = {
    data: { name: 'ecolist', description: 'View all economy data (Developer only)', usage: ',ecolist' },
    aliases: ['economylist'],
    cooldown: 0,
    async execute(message) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const data = loadEconomy();
        const users = Object.entries(data.users);

        if (!users.length) return message.reply({ embeds: [errorEmbed('Empty', 'No economy data found.')] });

        const leaderboard = users
            .sort((a, b) => (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank))
            .slice(0, 25)
            .map(([id, u], i) => `**${i + 1}.** <@${id}> — $${(u.wallet + u.bank).toLocaleString()} (W: $${u.wallet.toLocaleString()} | B: $${u.bank.toLocaleString()})`)
            .join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Economy Database',
                description: leaderboard,
                footer: { text: `Total users: ${users.length}` }
            })]
        });
    }
};
