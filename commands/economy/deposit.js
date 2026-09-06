const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, updateBank } = require('../../utils/economy');

module.exports = {
    data: { name: 'deposit', description: 'Deposit money into your bank', usage: ',deposit [amount/all]' },
    aliases: ['dep'],
    cooldown: 5,
    async execute(message, args) {
        const user = getUser(message.author.id);
        let amount;

        if (args[0] === 'all' || args[0] === 'max') {
            amount = user.wallet;
        } else {
            amount = parseInt(args[0]);
        }

        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Usage: ,deposit [amount/all]')] });
        if (amount > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        updateWallet(message.author.id, -amount);
        updateBank(message.author.id, amount);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Deposited',
                description: `Deposited **$${amount.toLocaleString()}** into your bank.`
            })]
        });
    }
};
