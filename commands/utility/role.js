const { createEmbed, errorEmbed, successEmbed, permissionDenied, roleInputError } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner, canAssignRole } = require('../../utils/permissions');
const { resolveRoleInput } = require('../../utils/helpers');

module.exports = {
    data: {
        name: 'role',
        description: 'Add or remove a role from a user',
        usage: ',role [@user] [@role or role name]'
    },
    aliases: ['addrole', 'removerole'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_roles')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,role [@user] [@role or role name]')] });

        const found = resolveRoleInput(message, args);
        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role [@user] [@role or role name]')] });
        const role = found.role;

        if (target.roles.cache.has(role.id)) {
            await target.roles.remove(role);
            return message.reply({ embeds: [successEmbed('Role Removed', `Removed **${role.name}** from **${target.user.tag}**.`)] });
        } else {
            if (!canAssignRole(message.member, role)) {
                return message.reply({ embeds: [errorEmbed('Role Hierarchy', `You can't grant **${role.name}** because it's at or above your highest role.`)] });
            }
            await target.roles.add(role);
            return message.reply({ embeds: [successEmbed('Role Added', `Added **${role.name}** to **${target.user.tag}**.`)] });
        }
    }
};
