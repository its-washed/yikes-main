const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, addItem } = require('../../utils/economy');
const { shopItems } = require('./shop');

module.exports = {
    data: { name: 'buy', description: 'Buy an item from the shop', usage: ',buy [item number] [quantity]' },
    aliases: ['purchase'],
    cooldown: 5,
    async execute(message, args) {
        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= shopItems.length) {
            return message.reply({ embeds: [errorEmbed('Invalid Item', 'Use `,shop` to see available items.')] });
        }

        const item = shopItems[index];
        const quantity = parseInt(args[1]) || 1;
        if (quantity <= 0) return message.reply({ embeds: [errorEmbed('Invalid Quantity', 'Quantity must be at least 1.')] });

        const totalCost = item.price * quantity;
        const user = getUser(message.author.id);

        if (user.wallet < totalCost) {
            return message.reply({ embeds: [errorEmbed('Not Enough', `You need **$${totalCost.toLocaleString()}** in your wallet.\nYou have: **$${user.wallet.toLocaleString()}**`)] });
        }

        updateWallet(message.author.id, -totalCost);
        addItem(message.author.id, item.name, quantity);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Purchase Complete',
                description: `Bought **${quantity}x ${item.name}** for **$${totalCost.toLocaleString()}**!`
            })]
        });
    }
};
