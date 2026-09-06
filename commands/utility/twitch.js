const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'twitch',
        description: 'Get Twitch streamer info',
        usage: ',twitch [username]'
    },
    aliases: ['stream'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,twitch [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x9146ff,
                title: `Twitch — ${username}`,
                description: `[View Channel](https://www.twitch.tv/${encodeURIComponent(username)})\n\n*Twitch API not connected.*`
            })]
        });
    }
};
