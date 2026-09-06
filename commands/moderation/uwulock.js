const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/uwulock.json');

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
        name: 'uwulock',
        description: 'Lock a user to only send uwu messages',
        usage: ',uwulock [@user] [on/off]'
    },
    aliases: ['ulock'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,uwulock [@user] [on/off]')] });

        const state = (args[1] || 'on').toLowerCase();
        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId]) data[guildId] = {};

        if (state === 'off') {
            delete data[guildId][target.id];
            saveData(data);
            return message.reply({ embeds: [successEmbed('UwULock', `${target.user.tag} is no longer uwulocked.`)] });
        }

        data[guildId][target.id] = {
            lockedBy: message.author.id,
            timestamp: Date.now()
        };
        saveData(data);

        return message.reply({ embeds: [successEmbed('UwULock', `${target.user.tag} is now uwulocked! They can only send uwu messages.`)] });
    }
};

module.exports.isUwULocked = function(guildId, userId) {
    const data = loadData();
    return !!(data[guildId] && data[guildId][userId]);
};
