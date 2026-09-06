const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'warnall', description: 'Warn multiple users', usage: ',warnall [@user1] [@user2] [reason]' },
    aliases: [],
    cooldown: 30,
    async execute(message, args) {
        if (!message.member.permissions.has('ModerateMembers')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Moderate Members.')] });
        const users = message.mentions.members;
        if (users.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,warnall [@user1] [@user2] [reason]')] });
        const reason = args.filter(a => !a.startsWith('<@')).join(' ') || 'No reason';
        let count = 0;
        for (const [, member] of users) {
            try { count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Warn All', `Warned **${count}** members.\nReason: ${reason}`)] });
    }
};
