const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, addItem } = require('../../utils/economy');

const huntCatch = [
    { name: 'Rabbit', min: 5, max: 30, chance: 0.25 },
    { name: 'Squirrel', min: 3, max: 20, chance: 0.2 },
    { name: 'Duck', min: 10, max: 50, chance: 0.15 },
    { name: 'Deer', min: 25, max: 120, chance: 0.1 },
    { name: 'Wild Boar', min: 40, max: 200, chance: 0.08 },
    { name: 'Bear', min: 80, max: 400, chance: 0.05 },
    { name: 'Fox', min: 30, max: 150, chance: 0.07 },
    { name: 'Wolf Pelt', min: 100, max: 500, chance: 0.03 },
    { name: 'Golden Eagle', min: 200, max: 800, chance: 0.02 },
    { name: 'Nothing', min: 0, max: 0, chance: 0.05 },
];

module.exports = {
    data: { name: 'hunt', description: 'Go hunting for animals and money', usage: ',hunt' },
    aliases: ['hunting'],
    cooldown: 60,
    async execute(message) {
        const user = getUser(message.author.id);

        const roll = Math.random();
        let cumulative = 0;
        let result = huntCatch[huntCatch.length - 1];

        for (const h of huntCatch) {
            cumulative += h.chance;
            if (roll < cumulative) { result = h; break; }
        }

        const earned = Math.floor(Math.random() * (result.max - result.min + 1)) + result.min;

        if (earned > 0) updateWallet(message.author.id, earned);
        addItem(message.author.id, result.name);

        return message.reply({
            embeds: [createEmbed({
                color: earned > 0 ? 0x22c55e : 0xff4757,
                title: 'Hunting',
                description: `You ventured into the wild and caught a **${result.name}**!${earned > 0 ? `\n\nValue: **$${earned.toLocaleString()}**` : ''}`
            })]
        });
    }
};
