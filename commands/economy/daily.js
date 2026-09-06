const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'daily', description: 'Claim your daily reward', usage: ',daily' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (now - user.lastDaily < cooldown) {
            const remaining = cooldown - (now - user.lastDaily);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return message.reply({ embeds: [errorEmbed('Cooldown', `Come back in **${hours}h ${minutes}m**.`)] });
        }

        const reward = Math.floor(Math.random() * 500) + 200;
        updateWallet(message.author.id, reward);

        const data = require('../../utils/economy').loadEconomy();
        data.users[message.author.id].lastDaily = now;
        require('../../utils/economy').saveEconomy(data);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Daily Reward',
                description: `You claimed your daily **$${reward.toLocaleString()}**!`
            })]
        });
    }
};
