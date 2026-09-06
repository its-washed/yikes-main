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
        name: 'topcards',
        description: 'View top card collectors',
        usage: ',topcards'
    },
    aliases: ['cardleaderboard', 'clb'],
    cooldown: 5,

    async execute(message) {
        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].cards || data[guildId].cards.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0xffa502, description: 'No cards collected yet.' })] });
        }

        const counts = {};
        data[guildId].cards.forEach(c => {
            counts[c.claimedBy] = (counts[c.claimedBy] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        const list = sorted.map(([id, count], i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[i] || `**${i + 1}.**`;
            return `${medal} <@${id}> — **${count}** cards`;
        }).join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Top Card Collectors',
                description: list
            })]
        });
    }
};
