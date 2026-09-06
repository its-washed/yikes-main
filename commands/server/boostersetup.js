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
        name: 'boostersetup',
        description: 'Configure booster role settings',
        usage: ',boostersetup [role] [position]'
    },
    aliases: ['bs', 'boostsetup'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server permission.')] });
        }

        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,boostersetup [@role]')] });

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId]) data[guildId] = {};

        data[guildId].boostRole = role.id;
        data[guildId].enabled = true;
        data[guildId].customRoles = {};

        saveData(data);

        return message.reply({
            embeds: [successEmbed('Booster Setup', `Booster role set to **${role.name}**.\n\nUse `,boostconfig` to configure position and options.`)]
        });
    }
};
