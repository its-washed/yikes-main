const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'massrole', description: 'Add a role to multiple users', usage: ',massrole [@role] [@user1] [@user2]' },
    aliases: [],
    cooldown: 60,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,massrole [@role] [@user1] [@user2]')] });
        const members = message.mentions.members.filter(m => m.id !== message.author.id);
        if (members.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Mention at least one user.')] });
        let count = 0;
        for (const [, member] of members) {
            try { await member.roles.add(role); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Mass Role', `Added **${role.name}** to **${count}** members.`)] });
    }
};
