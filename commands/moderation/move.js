const { PermissionFlagsBits } = require('discord.js');
const { parseMember, parseChannel } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'move',
        description: 'Move a user to another voice channel',
        usage: ',move @user #channel'
    },
    aliases: [],
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

        const channel = parseChannel(message, args[1] || '');
        if (!channel || channel.type !== 2) {
            return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Please mention a voice channel.')] });
        }

        try {
            await target.voice.setChannel(channel, `Moved by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Member Moved', `**${target.user.tag}** moved to ${channel}.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
