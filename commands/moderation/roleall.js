const { createEmbed, errorEmbed, permissionDenied, roleInputError } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner, canAssignRole } = require('../../utils/permissions');
const { resolveRoleInput } = require('../../utils/helpers');

module.exports = {
    data: { name: 'roleall', description: 'Give role to all members', usage: ',roleall [@role or role name]' },
    aliases: [],
    cooldown: 300,
    async execute(message, args) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [permissionDenied(message, 'administrator')] });
        const found = resolveRoleInput(message, args);
        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',roleall [@role or role name]')] });
        const role = found.role;
        if (!canAssignRole(message.member, role)) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', `You can't grant **${role.name}** because it's at or above your highest role.`)] });
        }
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Adding role to all members...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (!member.roles.cache.has(role.id)) {
                try { await member.roles.add(role); count++; } catch {}
            }
        }
        return msg.edit({ embeds: [createEmbed({ color: 0x22c55e, description: `Added **${role.name}** to **${count}** members.` })] });
    }
};
