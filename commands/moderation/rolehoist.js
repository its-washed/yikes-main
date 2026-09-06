const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rolehoist', description: 'Toggle role hoist', usage: ',rolehoist [@role] [on/off]' },
    aliases: ['hoist'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageRoles')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,rolehoist [@role] [on/off]')] });
        const state = (args[1] || 'on').toLowerCase() === 'on';
        await role.setHoist(state);
        return message.reply({ embeds: [successEmbed('Hoist', `**${role.name}** hoist set to **${state}**.`)] });
    }
};
