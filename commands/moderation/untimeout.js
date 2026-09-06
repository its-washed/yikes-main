const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'untimeout',
        description: 'Remove timeout from a member',
        usage: ',untimeout [@user]'
    },
    aliases: ['unmute'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ModerateMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Moderate Members permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,untimeout [@user]')] });

        try {
            await target.timeout(null);
            return message.reply({ embeds: [successEmbed('Timeout Removed', `Removed timeout from **${target.user.tag}**.`)] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not remove timeout.')] });
        }
    }
};
