const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'instagramprofile', description: 'Get Instagram profile', usage: ',instagramprofile [username]' },
    aliases: ['igprofile'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,instagramprofile [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xe1306c, title: `Instagram — ${user}`, description: `[View Profile](https://www.instagram.com/${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
