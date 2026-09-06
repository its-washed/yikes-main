const { PermissionFlagsBits } = require('discord.js');
const { parseRole } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'rolecolor',
        description: 'Change a role\'s color',
        usage: ',rolecolor @role #hexcolor'
    },
    aliases: ['rc', 'colorrole'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Roles` permission.')] });
        }

        const role = parseRole(message, args[0]);
        if (!role) return message.reply({ embeds: [errorEmbed('Role Not Found', 'Please mention a valid role.')] });

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', 'Cannot edit a role equal/higher than my highest role.')] });
        }

        const colorArg = args[1] || '';
        const hex = colorArg.replace('#', '');
        const color = parseInt(hex, 16);

        if (isNaN(color) || color < 0 || color > 0xFFFFFF) {
            return message.reply({ embeds: [errorEmbed('Invalid Color', 'Provide a valid hex color like `#ff0000` or `ff0000`.')] });
        }

        try {
            await role.setColor(color, `Color changed by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Color Changed', `Changed **${role.name}** color to #${hex.toUpperCase()}.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
