const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'slowmodeall', description: 'Set slowmode on all text channels', usage: ',slowmodeall [seconds]' },
    aliases: ['small'],
    cooldown: 60,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Must be 0-21600 seconds.')] });
        const channels = message.guild.channels.cache.filter(c => c.type === 0);
        let count = 0;
        for (const [, ch] of channels) {
            try { await ch.setRateLimitPerUser(seconds); count++; } catch {}
        }
        return message.reply({ embeds: [successEmbed('Slowmode All', `Set slowmode to **${seconds}s** on **${count}** channels.`)] });
    }
};
