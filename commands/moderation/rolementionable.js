const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'rolementionable', description: 'Toggle role mentionable', usage: ',rolementionable [@role] [on/off]' },
    aliases: ['mentionable'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,rolementionable [@role] [on/off]')] });
        const state = (args[1] || 'on').toLowerCase() === 'on';
        await role.setMentionable(state);
        return message.reply({ embeds: [successEmbed('Mentionable', `**${role.name}** mentionable set to **${state}**.`)] });
    }
};
