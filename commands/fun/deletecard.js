const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/cards.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    data: {
        name: 'deletecard',
        description: 'Delete a card from your collection',
        usage: ',deletecard [card_id]'
    },
    aliases: ['removecard', 'dcard'],
    cooldown: 5,

    async execute(message, args) {
        const cardId = args[0];
        if (!cardId) return message.reply({ embeds: [errorEmbed('Missing Card ID', 'Usage: ,deletecard [card_id]')] });

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].cards) {
            return message.reply({ embeds: [errorEmbed('No Cards', 'You have no cards.')] });
        }

        const idx = data[guildId].cards.findIndex(c => c.id === cardId && c.claimedBy === message.author.id);
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Card Not Found', 'You don\'t own a card with that ID.')] });

        const card = data[guildId].cards.splice(idx, 1)[0];
        saveData(data);

        return message.reply({ embeds: [successEmbed('Card Deleted', `Deleted **${card.character}** (${card.emoji} ${card.rarity})`)] });
    }
};
