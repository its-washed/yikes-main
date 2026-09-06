const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'perms', description: 'Check user permissions', usage: ',perms [@user]' },
    aliases: ['permissions', 'checkperms'],
    cooldown: 3,
    async execute(message) {
        const member = message.mentions.members.first() || message.member;
        const perms = member.permissions.toArray();
        const formatted = perms.map(p => `\`${p}\``).join(', ');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${member.user.tag}'s Permissions`, description: formatted.slice(0, 2000) || 'None' })] });
    }
};
