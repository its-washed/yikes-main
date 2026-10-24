const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'voicekick',
        description: 'Disconnect a user from voice',
        usage: ',voicekick [@user]'
    },
    aliases: ['vkick'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'MoveMembers')) {
            return message.reply({ embeds: [permissionDenied(message, 'move_members')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,voicekick [@user]')] });

        if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        await target.voice.disconnect();

        return message.reply({ embeds: [successEmbed('Voice Kick', `Kicked **${target.user.tag}** from voice.`)] });
    }
};
