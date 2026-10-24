const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'lock', description: 'Lock a channel', usage: ',lock [#channel] [reason]' },
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const reason = args.slice(1).join(' ').replace(/<#\d+>/g, '').trim() || `Locked by ${message.author.tag}`;

        await channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false }, { reason });
        return message.reply({ embeds: [successEmbed('Locked', `Locked ${channel}.`)] });
    }
};
