const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { CHARACTERS, getRarity } = require('./claim');

module.exports = {
    data: {
        name: 'cardroll',
        description: 'Roll a random anime card (no cooldown, no saving)',
        usage: ',cardroll'
    },
    aliases: ['rollcard', 'gacha'],
    cooldown: 3,

    async execute(message) {
        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const rarity = getRarity();

        return message.reply({
            embeds: [createEmbed({
                color: rarity.color,
                title: `${rarity.emoji} ${char.name}`,
                description: `**${char.series}**`,
                fields: [
                    { name: 'Rarity', value: `${rarity.emoji} ${rarity.name}`, inline: true },
                    { name: 'Tier', value: char.tier, inline: true }
                ],
                footer: { text: `Rolled by ${message.author.tag} | Use ,claim to save a card` },
                timestamp: new Date().toISOString()
            })]
        });
    }
};
