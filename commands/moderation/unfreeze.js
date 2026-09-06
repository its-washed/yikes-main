const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');

module.exports = {
    data: {
        name: 'unfreeze',
        description: 'Unfreeze a channel',
        usage: ',unfreeze [#channel]'
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
                SendMessages: true,
                AddReactions: true,
                SendMessagesInThreads: true,
                CreatePublicThreads: true,
                CreatePrivateThreads: true
            }, { reason: `Unfrozen by ${message.author.tag}` });

            const config = getGuildConfig(message.guild.id);
            const frozen = config.frozenChannels || [];
            const idx = frozen.indexOf(channel.id);
            if (idx !== -1) frozen.splice(idx, 1);
            updateGuildConfig(message.guild.id, { frozenChannels: frozen });

            return message.reply({ embeds: [successEmbed('Channel Unfrozen', `${channel} has been unfrozen.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
