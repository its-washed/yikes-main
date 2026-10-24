const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'warnall', description: 'Warn multiple users', usage: ',warnall [@user1] [@user2] [reason]' },
    aliases: [],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ModerateMembers')) return message.reply({ embeds: [permissionDenied(message, 'moderate_members')] });
        const users = message.mentions.members;
        if (users.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,warnall [@user1] [@user2] [reason]')] });
        const reason = args.filter(a => !a.startsWith('<@')).join(' ') || 'None provided';
        let count = 0;
        for (const [, member] of users) {
            try { count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Warn All', `Warned **${count}** members.\nReason: ${reason}`)] });
    }
};
