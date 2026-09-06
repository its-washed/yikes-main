const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'logging',
        description: 'Configure audit log channel',
        usage: ',logging [#channel|disable]'
    },
    aliases: ['log'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        if (!args[0] || args[0].toLowerCase() === 'disable') {
            updateGuildConfig(message.guild.id, { logChannel: null });
            return message.reply({ embeds: [successEmbed('Logging Disabled', 'Audit logging has been disabled.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a channel for logging.')] });
        }

        updateGuildConfig(message.guild.id, { logChannel: channel.id });

        return message.reply({
            embeds: [successEmbed('Logging Configured', `Audit logs will be sent to ${channel}.`)]
        });
    }
};
