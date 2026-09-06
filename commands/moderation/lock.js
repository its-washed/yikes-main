const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'lock',
        description: 'Lock a channel',
        usage: ',lock [#channel] [reason]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Channels` permission.')] });
        }

        let channel = message.channel;
        let reason = args.join(' ');

        if (message.mentions.channels.first()) {
            channel = message.mentions.channels.first();
            reason = args.slice(1).join(' ');
        }

        reason = reason || 'No reason provided';

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            }, { reason: `Locked by ${message.author.tag}: ${reason}` });

            return message.reply({
                embeds: [successEmbed('Channel Locked', `${channel} has been locked.\n**Reason:** ${reason}`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to lock channel: ${error.message}`)] });
        }
    }
};
