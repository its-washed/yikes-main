const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'voicekick',
        description: 'Disconnect someone from voice channel',
        usage: ',voicekick @user [reason]'
    },
    aliases: ['vk'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Move Members` permission.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });

        if (!target.voice.channel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });
        }

        try {
            await target.voice.disconnect(`Voice kicked by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Voice Kicked', `**${target.user.tag}** has been disconnected from voice.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
