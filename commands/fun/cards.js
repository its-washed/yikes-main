const { createEmbed, errorEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/cards.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

module.exports = {
    data: {
        name: 'cards',
        description: 'View your collected cards',
        usage: ',cards [@user]'
    },
    aliases: ['inventory', 'collection'],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].cards) {
            return message.reply({ embeds: [createEmbed({ color: 0xffa502, description: 'No cards collected yet. Use `,claim` to get one!' })] });
        }

        const userCards = data[guildId].cards.filter(c => c.claimedBy === target.id);

        if (userCards.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0xffa502, description: `${target.tag} has no cards yet.` })] });
        }

        const rarityCount = {};
        userCards.forEach(c => {
            rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + 1;
        });

        const rarityStr = Object.entries(rarityCount).map(([r, count]) => `${r}: **${count}**`).join(' | ');

        const page = parseInt(args[args.length - 1]) || 1;
        const perPage = 10;
        const totalPages = Math.ceil(userCards.length / perPage);
        const start = (page - 1) * perPage;
        const cards = userCards.slice(start, start + perPage);

        const cardList = cards.map(c => `${c.emoji} **${c.character}** (${c.series}) — \`${c.id}\``).join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `${target.tag}'s Cards (${userCards.length})`,
                description: cardList,
                fields: [{ name: 'Rarity Breakdown', value: rarityStr }],
                footer: { text: `Page ${page}/${totalPages} | Use ,cards [page] to navigate` }
            })]
        });
    }
};
