const { createEmbed } = require('../../utils/embeds');
const { updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'beg', description: 'Beg for money', usage: ',beg' },
    aliases: [],
    cooldown: 30,
    async execute(message) {
        const outcomes = [
            { text: 'A kind stranger gave you some coins.', min: 1, max: 100, chance: 0.4 },
            { text: 'Someone felt bad for you.', min: 50, max: 250, chance: 0.25 },
            { text: 'You found some coins on the ground.', min: 10, max: 75, chance: 0.5 },
            { text: 'A rich person tossed you some change.', min: 100, max: 500, chance: 0.15 },
            { text: 'You begged but got nothing.', min: 0, max: 0, chance: 0.35 },
            { text: 'A homeless person gave YOU money out of pity.', min: 1, max: 50, chance: 0.1 },
            { text: 'You got hit instead of getting money.', min: 0, max: 0, chance: 0.15 },
            { text: 'Elon Musk laughed at you.', min: 0, max: 0, chance: 0.1 },
        ];

        const roll = Math.random();
        let cumulative = 0;
        let outcome = outcomes[outcomes.length - 1];

        for (const o of outcomes) {
            cumulative += o.chance;
            if (roll < cumulative) { outcome = o; break; }
        }

        const earned = Math.floor(Math.random() * (outcome.max - outcome.min + 1)) + outcome.min;
        if (earned > 0) updateWallet(message.author.id, earned);

        return message.reply({
            embeds: [createEmbed({
                color: earned > 0 ? 0x22c55e : 0xff4757,
                title: 'Begging',
                description: `${outcome.text}\n${earned > 0 ? `You received **$${earned.toLocaleString()}**.` : 'You received nothing.'}`
            })]
        });
    }
};
