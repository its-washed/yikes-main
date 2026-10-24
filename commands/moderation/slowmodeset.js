const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'slowmodeset', description: 'Set slowmode on a channel', usage: ',slowmodeset [#channel] [seconds]' },
    aliases: ['sms'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        const channel = message.mentions.channels.first() || message.channel;
        const seconds = parseInt(args[1] || args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Must be 0-21600 seconds.')] });
        await channel.setRateLimitPerUser(seconds);
        return message.reply({ embeds: [successEmbed('Slowmode Set', `Slowmode on **${channel.name}** set to **${seconds}s**.`)] });
    }
};
