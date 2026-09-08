const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, loadEconomy, saveEconomy } = require('../../utils/economy');

module.exports = {
    data: { name: 'monthly', description: 'Claim your monthly reward', usage: ',monthly' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const user = getUser(message.author.id);
        const now = Date.now();
        const cooldown = 30 * 24 * 60 * 60 * 1000;

        if (now - user.lastMonthly < cooldown) {
            const remaining = cooldown - (now - user.lastMonthly);
            const days = Math.floor(remaining / 86400000);
            const hours = Math.floor((remaining % 86400000) / 3600000);
            return message.reply({ embeds: [errorEmbed('Cooldown', `Come back in **${days}d ${hours}h**.`)] });
        }

        const reward = Math.floor(Math.random() * 5000) + 5000;
        updateWallet(message.author.id, reward);

        const data = loadEconomy();
        data.users[message.author.id].lastMonthly = now;
        saveEconomy(data);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Monthly Reward',
                description: `You claimed your monthly **$${reward.toLocaleString()}**!`
            })]
        });
    }
};
