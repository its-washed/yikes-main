const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'rolecolor',
        description: 'Change a role\'s color',
        usage: ',rolecolor [@role] [color]'
    },
    aliases: ['rcolor', 'setcolor'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageRoles')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Roles permission.')] });
        }

        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,rolecolor [@role] [hex]')] });

        const color = args[1];
        if (!color) return message.reply({ embeds: [errorEmbed('Missing Color', 'Provide a hex color like `#ff0000`.')] });

        const hex = color.startsWith('#') ? color : `#${color}`;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return message.reply({ embeds: [errorEmbed('Invalid Color', 'Provide a valid hex code.')] });

        try {
            await role.setColor(hex);
            return message.reply({ embeds: [successEmbed('Color Changed', `Set **${role.name}** color to **${hex}**.`)] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not change role color.')] });
        }
    }
};
