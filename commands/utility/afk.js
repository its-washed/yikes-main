const { createEmbed, errorEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/afk.json');

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
        name: 'afk',
        description: 'Set your AFK status',
        usage: ',afk [reason]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId]) data[guildId] = {};

        data[guildId][message.author.id] = {
            reason: reason,
            timestamp: Date.now()
        };

        saveData(data);

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'AFK Set',
                description: `${message.author.tag} is now AFK.\n**Reason:** ${reason}`
            })]
        });
    }
};
