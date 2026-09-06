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
        name: 'boostlog',
        description: 'Configure boost log channel',
        usage: ',boostlog [#channel]'
    },
    aliases: ['boostchannel'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server permission.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,boostlog [#channel]')] });

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId]) data[guildId] = {};
        data[guildId].boostLogChannel = channel.id;

        saveData(data);

        return message.reply({ embeds: [successEmbed('Boost Log', `Boost log channel set to ${channel}.`)] });
    }
};
