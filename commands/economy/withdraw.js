const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, updateBank } = require('../../utils/economy');

module.exports = {
    data: { name: 'withdraw', description: 'Withdraw money from your bank', usage: ',withdraw [amount/all]' },
    aliases: ['wd'],
    cooldown: 5,
    async execute(message, args) {
        const user = getUser(message.author.id);
        let amount;

        if (args[0] === 'all' || args[0] === 'max') {
            amount = user.bank;
        } else {
            amount = parseInt(args[0]);
        }

        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Usage: ,withdraw [amount/all]')] });
        if (amount > user.bank) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.bank.toLocaleString()}** in your bank.`)] });

        updateWallet(message.author.id, amount);
        updateBank(message.author.id, -amount);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Withdrew',
                description: `Withdrew **$${amount.toLocaleString()}** from your bank.`
            })]
        });
    }
};
