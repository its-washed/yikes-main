const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roleposition', description: 'Show role position', usage: ',roleposition [@role]' },
    aliases: ['rpos'],
    cooldown: 3,
    async execute(message, args) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,roleposition [@role]')] });
        return message.reply({ embeds: [createEmbed({ color: role.color || 0x6c5ce7, title: `${role.name}`, description: `Position: **${role.position}**` })] });
    }
};
