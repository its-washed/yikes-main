const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'nick',
        description: 'Change a member\'s nickname',
        usage: ',nick [@user] [nickname]'
    },
    aliases: ['nickname'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageNicknames')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_nicknames')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,nick [@user] [nickname]')] });

        const nick = args.slice(1).join(' ');
        if (!nick) return message.reply({ embeds: [errorEmbed('Missing Nickname', 'Provide a nickname.')] });

        try {
            await target.setNickname(nick);
            return message.reply({ embeds: [successEmbed('Nickname Changed', `Changed **${target.user.tag}** nickname to **${nick}**.`)] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not change nickname.')] });
        }
    }
};
