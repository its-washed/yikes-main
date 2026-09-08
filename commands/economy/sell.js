const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, getInventory, removeItem } = require('../../utils/economy');
const { shopItems } = require('./shop');

module.exports = {
    data: { name: 'sell', description: 'Sell an item from your inventory', usage: ',sell [item name] [quantity]' },
    aliases: [],
    cooldown: 5,
    async execute(message, args) {
        if (!args[0]) return message.reply({ embeds: [errorEmbed('Missing Item', 'Usage: ,sell [item name] [quantity]')] });

        const itemName = args[0];
        const quantity = parseInt(args[1]) || 1;

        const inventory = getInventory(message.author.id);
        const owned = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());

        if (!owned || owned.quantity < quantity) {
            return message.reply({ embeds: [errorEmbed('Not Found', `You don't have enough **${itemName}**.`)] });
        }

        const shopItem = shopItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (!shopItem) {
            return message.reply({ embeds: [errorEmbed('Cannot Sell', `**${itemName}** is not a shop item.`)] });
        }

        removeItem(message.author.id, shopItem.name, quantity);
        const totalValue = shopItem.sell * quantity;
        updateWallet(message.author.id, totalValue);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Sold!',
                description: `Sold **${quantity}x ${shopItem.name}** for **$${totalValue.toLocaleString()}**!`
            })]
        });
    }
};
