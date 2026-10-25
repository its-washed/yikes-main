const { createEmbed, errorEmbed, successEmbed, permissionDenied, roleInputError } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner, canAssignRole } = require('../../utils/permissions');
const { resolveRoleInput } = require('../../utils/helpers');

module.exports = {
    data: { name: 'massrole', description: 'Add a role to multiple users', usage: ',massrole [@role or role name] [@user1] [@user2]' },
    aliases: [],
    cooldown: 60,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) return message.reply({ embeds: [permissionDenied(message, 'manage_roles')] });
        const found = resolveRoleInput(message, args);
        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',massrole [@role or role name] [@user1] [@user2]')] });
        const role = found.role;
        if (!canAssignRole(message.member, role)) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', `You can't grant **${role.name}** because it's at or above your highest role.`)] });
        }
        const members = message.mentions.members.filter(m => m.id !== message.author.id);
        if (members.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Mention at least one user.')] });
        let count = 0;
        for (const [, member] of members) {
            try { await member.roles.add(role); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Mass Role', `Added **${role.name}** to **${count}** members.`)] });
    }
};
