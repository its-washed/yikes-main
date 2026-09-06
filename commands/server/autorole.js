const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { parseRole } = require('../../utils/helpers');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'autorole',
        description: 'Configure auto role for new members',
        usage: ',autorole [@role|disable]'
    },
    aliases: ['ar'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Roles` permission.')] });
        }

        if (!args[0] || args[0].toLowerCase() === 'disable') {
            updateGuildConfig(message.guild.id, { autorole: null });
            return message.reply({ embeds: [successEmbed('Auto Role Disabled', 'Auto role has been disabled.')] });
        }

        const role = parseRole(message, args[0]);
        if (!role) {
            return message.reply({ embeds: [errorEmbed('Role Not Found', 'Please mention a valid role.')] });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', 'I cannot assign a role equal to or higher than my highest role.')] });
        }

        updateGuildConfig(message.guild.id, { autorole: role.id });

        return message.reply({
            embeds: [successEmbed('Auto Role Set', `New members will automatically receive ${role}.`)]
        });
    }
};
