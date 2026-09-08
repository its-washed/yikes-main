const { createEmbed } = require('../../utils/embeds');
const { getInventory } = require('../../utils/economy');

module.exports = {
    data: { name: 'inventory', description: 'View your inventory', usage: ',inventory' },
    aliases: ['inv', 'items'],
    cooldown: 5,
    async execute(message) {
        const items = getInventory(message.author.id);

        if (!items.length) {
            return message.reply({
                embeds: [createEmbed({ color: 0x6c5ce7, title: 'Inventory', description: 'Your inventory is empty.\n\nUse `,fish`, `,hunt`, or `,shop` to get items!' })]
            });
        }

        const list = items.map(i => `**${i.name}** x${i.quantity}`).join('\n');
        const total = items.reduce((sum, i) => sum + i.quantity, 0);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `${message.author.tag}'s Inventory`,
                description: list,
                footer: { text: `${total} total item(s)` }
            })]
        });
    }
};
