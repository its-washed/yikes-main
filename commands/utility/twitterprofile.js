const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'twitterprofile', description: 'Get Twitter profile', usage: ',twitterprofile [username]' },
    aliases: ['xprofile'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,twitterprofile [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x000000, title: `X — ${user}`, description: `[View Profile](https://x.com/${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
