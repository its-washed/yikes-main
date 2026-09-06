const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { modLogEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'unmute',
        description: 'Remove timeout from a member',
        usage: ',unmute @user'
    },
    aliases: ['untimeout'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Moderate Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Moderate Members` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Target', 'Please mention a user or provide their ID.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) {
            return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user in this server.')] });
        }

        if (!target.isCommunicationDisabled()) {
            return message.reply({ embeds: [errorEmbed('Not Muted', 'That user is not currently timed out.')] });
        }

        try {
            await target.timeout(null, `Unmuted by ${message.author.tag}`);

            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                logChannel.send({
                    embeds: [modLogEmbed('Unmute', message.author, target, 'Removed timeout', 0x00d26a)]
                });
            }

            return message.reply({
                embeds: [successEmbed('Member Unmuted', `**${target.user.tag}** has been unmuted.`)]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to unmute: ${error.message}`)] });
        }
    }
};
