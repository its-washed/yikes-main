const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { warn } = require('../../utils/context');

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
        description: "Set an AFK status for when you are mentioned",
        usage: ',afk [reason]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        const reason = args.join(' ') || 'AFK';
        if (reason.length > 100) {
            return warn(message, 'Reason for being AFK cannot exceed **100** characters');
        }
        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId]) data[guildId] = {};

        data[guildId][message.author.id] = {
            reason: reason,
            timestamp: Date.now()
        };

        saveData(data);

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(0xffd600)
                .setDescription(`😴 <@${message.author.id}>: You're now AFK with the status: **${reason}**`)
            ]
        });
    }
};
