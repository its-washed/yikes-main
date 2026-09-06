const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'reddituser', description: 'Get Reddit user profile', usage: ',reddituser [username]' },
    aliases: ['ru'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,reddituser [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4500, title: `Reddit — u/${user}`, description: `[View Profile](https://www.reddit.com/user/${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
