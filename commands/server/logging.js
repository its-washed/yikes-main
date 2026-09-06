const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'logging',
        description: 'Configure audit log channel',
        usage: ',logging [#channel|disable]'
    },
    aliases: ['log'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
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
