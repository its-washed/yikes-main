const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'deafen',
        description: 'Deafen a member in voice',
        usage: ',deafen @user [reason]'
    },
    aliases: ['deaf'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Deafen Members` permission.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });

        if (!target.voice.channel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.voice.setDeaf(true, reason);
            return message.reply({ embeds: [successEmbed('Member Deafened', `**${target.user.tag}** has been deafened.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
