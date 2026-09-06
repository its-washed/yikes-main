const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/boosters.json');

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
        name: 'boosters',
        description: 'View all server boosters',
        usage: ',boosters'
    },
    aliases: ['listboosters'],
    cooldown: 10,

    async execute(message) {
        const boosters = message.guild.members.cache.filter(m => m.premiumSince);

        if (boosters.size === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0xec4899, description: 'No boosters in this server.' })] });
        }

        const list = boosters.map(m => {
            const duration = Math.floor((Date.now() - m.premiumSinceTimestamp) / 86400000);
            return `${m.user.tag} — **${duration}** day(s)`;
        }).join('\n');

        return message.reply({
            embeds: [createEmbed({
                color: 0xec4899,
                title: `Server Boosters (${boosters.size})`,
                description: list
            })]
        });
    }
};
