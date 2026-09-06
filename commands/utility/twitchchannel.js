const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'twitchchannel', description: 'Get Twitch channel info', usage: ',twitchchannel [username]' },
    aliases: ['tc'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,twitchchannel [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x9146ff, title: `Twitch — ${user}`, description: `[View Channel](https://www.twitch.tv/${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
