const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'instagram',
        description: 'Get Instagram profile info',
        usage: ',instagram [username]'
    },
    aliases: ['ig', 'insta'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,instagram [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xe1306c,
                title: `Instagram — @${username}`,
                description: `[View Profile](https://www.instagram.com/${encodeURIComponent(username)})\n\n*Instagram API not connected.*`
            })]
        });
    }
};
