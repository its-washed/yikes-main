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
        name: 'boostconfig',
        description: 'Configure booster role position and options',
        usage: ',boostconfig [position] [above/below]'
    },
    aliases: ['boostsettings'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server permission.')] });
        }

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].boostRole) {
            return message.reply({ embeds: [errorEmbed('Not Setup', 'Run `,boostersetup` first.')] });
        }

        const position = args[0];
        const direction = (args[1] || 'above').toLowerCase();

        if (position) {
            data[guildId].position = parseInt(position);
        }
        data[guildId].direction = direction === 'below' ? 'below' : 'above';
        data[guildId].allowCustomization = true;

        saveData(data);

        const boostRole = message.guild.roles.cache.get(data[guildId].boostRole);

        return message.reply({
            embeds: [successEmbed('Booster Config', `**Boost Role:** ${boostRole ? boostRole.name : 'Unknown'}\n**Position:** ${data[guildId].position || 'Default'}\n**Direction:** ${data[guildId].direction}\n**Custom Roles:** Enabled\n\nBoosters can now use `,boostrole` to customize their role.`)]
        });
    }
};
