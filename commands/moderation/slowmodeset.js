const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'slowmodeset', description: 'Set slowmode on a channel', usage: ',slowmodeset [#channel] [seconds]' },
    aliases: ['sms'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        const seconds = parseInt(args[1] || args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Must be 0-21600 seconds.')] });
        await channel.setRateLimitPerUser(seconds);
        return message.reply({ embeds: [successEmbed('Slowmode Set', `Slowmode on **${channel.name}** set to **${seconds}s**.`)] });
    }
};
