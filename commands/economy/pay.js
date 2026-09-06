const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'pay', description: 'Pay another user', usage: ',pay [@user] [amount]' },
    aliases: ['give', 'transfer'],
    cooldown: 10,
    async execute(message, args) {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,pay [@user] [amount]')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot pay yourself.')] });
        if (target.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot pay bots.')] });
        if (isNaN(amount) || amount <= 0) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Usage: ,pay [@user] [amount]')] });

        const user = getUser(message.author.id);
        if (amount > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        updateWallet(message.author.id, -amount);
        updateWallet(target.id, amount);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Payment',
                description: `${message.author} paid **$${amount.toLocaleString()}** to ${target}.`
            })]
        });
    }
};
