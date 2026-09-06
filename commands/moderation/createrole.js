const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'createrole', description: 'Create a new role', usage: ',createrole [name]' },
    aliases: ['newrole'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles.')] });
        const name = args.join(' ');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,createrole [name]')] });
        const role = await message.guild.roles.create({ name, reason: `Created by ${message.author.tag}` });
        return message.reply({ embeds: [successEmbed('Role Created', `Created **${role.name}**.`)] });
    }
};
