const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'slowmode',
        description: 'Set slowmode for a channel',
        usage: ',slowmode [seconds]'
    },
    aliases: ['sm'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels permission.')] });
        }

        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Provide a number between 0 and 21600 seconds.')] });
        }

        await message.channel.setRateLimitPerUser(seconds);

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Slowmode Set', description: `Slowmode set to **${seconds}** seconds.` })] });
    }
};
