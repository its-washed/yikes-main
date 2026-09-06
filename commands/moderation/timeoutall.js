const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'timeoutall', description: 'Timeout multiple users', usage: ',timeoutall [@user1] [@user2] [duration]' },
    aliases: ['tmall'],
    cooldown: 30,
    async execute(message, args) {
        if (!message.member.permissions.has('ModerateMembers')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Moderate Members.')] });
        const users = message.mentions.members;
        if (users.size === 0) return message.reply({ embeds: [errorEmbed('Missing Users', 'Usage: ,timeoutall [@user1] [@user2] [duration]')] });
        const duration = args.find(a => /^\d+[mhd]$/.test(a)) || '10m';
        const match = duration.match(/^(\d+)([mhd])$/);
        const ms = parseInt(match[1]) * ({ m: 60000, h: 3600000, d: 86400000 }[match[2]]);
        let count = 0;
        for (const [, member] of users) {
            try { await member.timeout(ms, 'Mass timeout'); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Timeout All', `Timed out **${count}** members for **${duration}**.`)] });
    }
};
