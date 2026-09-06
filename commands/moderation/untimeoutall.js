const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'untimeoutall', description: 'Remove timeout from multiple users', usage: ',untimeoutall [@user1] [@user2]' },
    aliases: ['utmall'],
    cooldown: 30,
    async execute(message) {
        if (!message.member.permissions.has('ModerateMembers')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Moderate Members.')] });
        const users = message.mentions.members;
        if (users.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,untimeoutall [@user1] [@user2]')] });
        let count = 0;
        for (const [, member] of users) {
            try { await member.timeout(null); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Untimeout All', `Removed timeout from **${count}** members.`)] });
    }
};
