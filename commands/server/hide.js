const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'hide',
        description: 'Hide a channel from everyone',
        usage: ',hide [#channel]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: false
            }, { reason: `Hidden by ${message.author.tag}` });

            return message.reply({ embeds: [successEmbed('Channel Hidden', `${channel} is now hidden from everyone.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
