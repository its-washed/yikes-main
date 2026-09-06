const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'weekly', description: 'Claim your weekly reward', usage: ',weekly' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 7 * 24 * 60 * 60 * 1000;

        if (now - user.lastWeekly < cooldown) {
            const remaining = cooldown - (now - user.lastWeekly);
            const days = Math.floor(remaining / 86400000);
            const hours = Math.floor((remaining % 86400000) / 3600000);
            return message.reply({ embeds: [errorEmbed('Cooldown', `Come back in **${days}d ${hours}h**.`)] });
        }

        const reward = Math.floor(Math.random() * 5000) + 2000;
        updateWallet(message.author.id, reward);

        const data = require('../../utils/economy').loadEconomy();
        data.users[message.author.id].lastWeekly = now;
        require('../../utils/economy').saveEconomy(data);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Weekly Reward',
                description: `You claimed your weekly **$${reward.toLocaleString()}**!`
            })]
        });
    }
};
