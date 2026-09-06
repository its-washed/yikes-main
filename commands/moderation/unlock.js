const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'unlock',
        description: 'Unlock a channel',
        usage: ',unlock [#channel]'
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

        const channel = message.mentions.channels.first() || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: true
            }, { reason: `Unlocked by ${message.author.tag}` });

            return message.reply({
                embeds: [successEmbed('Channel Unlocked', `${channel} has been unlocked.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to unlock channel: ${error.message}`)] });
        }
    }
};
