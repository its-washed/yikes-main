const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'twitter',
        description: 'Get Twitter/X profile info',
        usage: ',twitter [username]'
    },
    aliases: ['x', 'tweet'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,twitter [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x000000,
                title: `X (Twitter) — @${username}`,
                description: `[View Profile](https://x.com/${encodeURIComponent(username)})\n\n*Twitter API not connected.*`
            })]
        });
    }
};
