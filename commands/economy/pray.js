const { createEmbed } = require('../../utils/embeds');
const { updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'pray', description: 'Pray for money', usage: ',pray' },
    aliases: [],
    cooldown: 60,
    async execute(message) {
        const outcomes = [
            { text: 'God blessed you with riches!', min: 200, max: 1000, chance: 0.08 },
            { text: 'The gods heard your prayers.', min: 50, max: 300, chance: 0.2 },
            { text: 'Your prayer was answered with a small blessing.', min: 10, max: 100, chance: 0.3 },
            { text: 'A beam of light shines on you... nothing happens.', min: 0, max: 0, chance: 0.25 },
            { text: 'The gods are busy today.', min: 0, max: 0, chance: 0.15 },
            { text: 'You accidentally prayed to the wrong god.', min: 0, max: 0, chance: 0.1 },
            { text: 'Lightning strikes you for praying to false idols!', min: 0, max: 0, chance: 0.05 },
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
                color: earned > 0 ? 0xffd700 : 0xff4757,
                title: 'Praying',
                description: `${outcome.text}\n${earned > 0 ? `You received **$${earned.toLocaleString()}**.` : 'You received nothing.'}`
            })]
        });
    }
};
