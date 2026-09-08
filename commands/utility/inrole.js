const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'inrole', description: 'Show members with a role', usage: ',inrole [@role]' },
    aliases: [''],
    cooldown: 10,
    async execute(message, args) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,inrole [@role]')] });
        const members = role.members;
        return message.reply({ embeds: [createEmbed({ color: role.color || 0x6c5ce7, title: `${role.name} (${members.size})`, description: members.map(m => m.user.tag).join('\n').slice(0, 2000) || 'No members' })] });
    }
};
