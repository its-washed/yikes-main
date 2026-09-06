const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'reddit',
        description: 'Get Reddit user info',
        usage: ',reddit [username]'
    },
    aliases: ['redditor'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,reddit [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xff4500,
                title: `Reddit — u/${username}`,
                description: `[View Profile](https://www.reddit.com/user/${encodeURIComponent(username)})\n\n*Reddit API not connected.*`
            })]
        });
    }
};
