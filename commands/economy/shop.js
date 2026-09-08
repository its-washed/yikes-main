const { createEmbed } = require('../../utils/embeds');

const shopItems = [
    { name: 'Fishing Rod', price: 500, sell: 250, description: 'Increases fish rewards by 10%' },
    { name: 'Hunting Rifle', price: 800, sell: 400, description: 'Increases hunt rewards by 10%' },
    { name: 'Lockpick Set', price: 300, sell: 150, description: 'Reduces crime fail chance by 10%' },
    { name: 'Lucky Charm', price: 1000, sell: 500, description: 'Increases gambling wins by 5%' },
    { name: 'Fake ID', price: 600, sell: 300, description: 'Reduces rob fail chance by 10%' },
    { name: 'Diamond Ring', price: 2500, sell: 1250, description: 'A shiny diamond ring' },
    { name: 'Gold Bar', price: 5000, sell: 2500, description: 'A solid gold bar' },
    { name: 'Sports Car', price: 15000, sell: 7500, description: 'A luxury sports car' },
    { name: 'Yacht', price: 50000, sell: 25000, description: 'Your own yacht' },
    { name: 'Private Island', price: 100000, sell: 50000, description: 'A private island paradise' },
];

module.exports = {
    data: { name: 'shop', description: 'View the item shop', usage: ',shop' },
    aliases: ['store', 'market'],
    cooldown: 5,
    async execute(message) {
        const list = shopItems.map((item, i) =>
            `**${i + 1}. ${item.name}** — $${item.price.toLocaleString()}\n_${item.description}_\nSell value: $${item.sell.toLocaleString()}`
        ).join('\n\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Item Shop',
                description: list,
                footer: { text: 'Use ,buy [item number] to purchase' }
            })]
        });
    }
};

module.exports.shopItems = shopItems;
