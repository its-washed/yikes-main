const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'starboard',
        description: 'Configure starboard',
        usage: ',starboard [#channel] [threshold] [disable]'
    },
    aliases: ['sb'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        if (!args[0] || args[0].toLowerCase() === 'disable') {
            updateGuildConfig(message.guild.id, {
                starboard: { enabled: false, channel: null, threshold: 5 }
            });
            return message.reply({ embeds: [successEmbed('Starboard Disabled', 'Starboard has been disabled.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [errorEmbed('Missing Channel', 'Please mention a channel for the starboard.')] });
        }

        const threshold = parseInt(args[1]) || 5;

        updateGuildConfig(message.guild.id, {
            starboard: { enabled: true, channel: channel.id, threshold }
        });

        return message.reply({
            embeds: [successEmbed('Starboard Configured', `Starboard enabled in ${channel} with ${threshold} ⭐ threshold.`)]
        });
    }
};
