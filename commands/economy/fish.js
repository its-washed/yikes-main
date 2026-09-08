const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, addItem } = require('../../utils/economy');

const fishCaught = [
    { name: 'Old Boot', min: 1, max: 10, chance: 0.25 },
    { name: 'Tin Can', min: 1, max: 5, chance: 0.2 },
    { name: 'Seaweed', min: 1, max: 15, chance: 0.2 },
    { name: 'Small Fish', min: 10, max: 50, chance: 0.15 },
    { name: 'Crab', min: 15, max: 75, chance: 0.08 },
    { name: 'Octopus', min: 25, max: 100, chance: 0.05 },
    { name: 'Swordfish', min: 50, max: 250, chance: 0.03 },
    { name: 'Golden Fish', min: 100, max: 500, chance: 0.02 },
    { name: 'Treasure Chest', min: 200, max: 1000, chance: 0.01 },
    { name: 'Nothing', min: 0, max: 0, chance: 0.01 },
];

module.exports = {
    data: { name: 'fish', description: 'Go fishing for items and money', usage: ',fish' },
    aliases: ['fishing'],
    cooldown: 60,
    async execute(message) {
        const user = getUser(message.author.id);
        const now = Date.now();

        const roll = Math.random();
        let cumulative = 0;
        let result = fishCaught[fishCaught.length - 1];

        for (const f of fishCaught) {
            cumulative += f.chance;
            if (roll < cumulative) { result = f; break; }
        }

        const earned = Math.floor(Math.random() * (result.max - result.min + 1)) + result.min;

        if (earned > 0) updateWallet(message.author.id, earned);
        addItem(message.author.id, result.name);

        return message.reply({
            embeds: [createEmbed({
                color: earned > 0 ? 0x22c55e : 0xff4757,
                title: 'Fishing',
                description: `You cast your line and caught a **${result.name}**!${earned > 0 ? `\n\nValue: **$${earned.toLocaleString()}**` : ''}`
            })]
        });
    }
};
