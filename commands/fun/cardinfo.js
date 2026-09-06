const { createEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/cards.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

module.exports = {
    data: {
        name: 'cardinfo',
        description: 'Get info on a card by ID',
        usage: ',cardinfo [card_id]'
    },
    aliases: ['ci'],
    cooldown: 3,

    async execute(message, args) {
        const cardId = args[0];
        if (!cardId) return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Provide a card ID.' })] });

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].cards) {
            return message.reply({ embeds: [createEmbed({ color: 0xffa502, description: 'No cards exist yet.' })] });
        }

        const card = data[guildId].cards.find(c => c.id === cardId);
        if (!card) return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Card not found.' })] });

        return message.reply({
            embeds: [createEmbed({
                color: card.color,
                title: `${card.emoji} ${card.character}`,
                fields: [
                    { name: 'Series', value: card.series, inline: true },
                    { name: 'Rarity', value: `${card.emoji} ${card.rarity}`, inline: true },
                    { name: 'Tier', value: card.tier, inline: true },
                    { name: 'Owner', value: `<@${card.claimedBy}>`, inline: true },
                    { name: 'Claimed', value: `<t:${Math.floor(card.claimedAt / 1000)}:R>`, inline: true },
                    { name: 'Card ID', value: `\`${card.id}\``, inline: true }
                ]
            })]
        });
    }
};
