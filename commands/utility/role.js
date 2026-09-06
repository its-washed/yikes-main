const { PermissionFlagsBits } = require('discord.js');
const { parseMember, parseRole } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'role',
        description: 'Add or remove a role from a member',
        usage: ',role [@user] [@role]'
    },
    aliases: ['r'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Roles` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Roles` permission.')] });
        }

        if (!args[0] || !args[1]) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,role [@user] [@role]')] });
        }

        const member = parseMember(message, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });
        }

        const role = parseRole(message, args[1]);
        if (!role) {
            return message.reply({ embeds: [errorEmbed('Role Not Found', 'Could not find that role.')] });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', 'I cannot manage this role.')] });
        }

        try {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role, `Removed by ${message.author.tag}`);
                return message.reply({ embeds: [successEmbed('Role Removed', `Removed ${role} from ${member}.`)] });
            } else {
                await member.roles.add(role, `Added by ${message.author.tag}`);
                return message.reply({ embeds: [successEmbed('Role Added', `Added ${role} to ${member}.`)] });
            }
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to modify role: ${error.message}`)] });
        }
    }
};
