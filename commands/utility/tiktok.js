const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'tiktok',
        description: 'Get TikTok profile info',
        usage: ',tiktok [username]'
    },
    aliases: ['ttprofile'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,tiktok [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x000000,
                title: `TikTok — @${username}`,
                description: `[View Profile](https://www.tiktok.com/@${encodeURIComponent(username)})\n\n*TikTok API not connected.*`
            })]
        });
    }
};
