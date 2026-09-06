const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { updateGuildConfig } = require('../../utils/config');

module.exports = {
    data: {
        name: 'freeze',
        description: 'Freeze a channel (lock + disable all reactions/embeds)',
        usage: ',freeze [#channel]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        try {
            const everyone = message.guild.roles.everyone;
            await channel.permissionOverwrites.edit(everyone, {
                SendMessages: false,
                AddReactions: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
            }, { reason: `Frozen by ${message.author.tag}` });

            updateGuildConfig(message.guild.id, {
                frozenChannels: [...(message.guild.frozenChannels || []), channel.id]
            });

            return message.reply({ embeds: [successEmbed('Channel Frozen', `${channel} has been frozen. All messages and reactions disabled.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
