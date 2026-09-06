const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'role',
        description: 'Add or remove a role from a user',
        usage: ',role [@user] [@role]'
    },
    aliases: ['addrole', 'removerole'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,role [@user] [@role]')] });

        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,role [@user] [@role]')] });

        if (target.roles.cache.has(role.id)) {
            await target.roles.remove(role);
            return message.reply({ embeds: [successEmbed('Role Removed', `Removed **${role.name}** from **${target.user.tag}**.`)] });
        } else {
            await target.roles.add(role);
            return message.reply({ embeds: [successEmbed('Role Added', `Added **${role.name}** to **${target.user.tag}**.`)] });
        }
    }
};
