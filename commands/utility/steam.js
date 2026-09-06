const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'steam',
        description: 'Get Steam profile info',
        usage: ',steam [username]'
    },
    aliases: ['steamprofile'],
    cooldown: 10,

    async execute(message, args) {
        const username = args.join(' ');
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,steam [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x1b2838,
                title: `Steam — ${username}`,
                description: `[View Profile](https://steamcommunity.com/id/${encodeURIComponent(username)})\n\n*Steam API not connected. Connect for live data.*`
            })]
        });
    }
};
