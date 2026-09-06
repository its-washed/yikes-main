const { PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'slowmode',
        description: 'Set slowmode for a channel',
        usage: ',slowmode [duration]'
    },
    aliases: ['sm'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Channels` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        let duration = 0;

        if (args[0] && args[0] !== 'off') {
            const parsed = parseDuration(args[0]);
            if (parsed) {
                duration = Math.min(parsed / 1000, 21600);
            } else {
                duration = parseInt(args[0]) || 0;
                duration = Math.min(Math.max(duration, 0), 21600);
            }
        }

        try {
            await channel.setRateLimitPerUser(duration, `Set by ${message.author.tag}`);

            const durationStr = duration === 0 ? 'Disabled' : formatDuration(duration * 1000);

            return message.reply({
                embeds: [successEmbed('Slowmode Updated', `Slowmode for ${channel} set to **${durationStr}**.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to set slowmode: ${error.message}`)] });
        }
    }
};
