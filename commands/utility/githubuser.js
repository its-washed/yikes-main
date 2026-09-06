const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'githubuser', description: 'Get GitHub user profile', usage: ',githubuser [username]' },
    aliases: ['ghuser'],
    cooldown: 10,
    async execute(message, args) {
        const user = args[0];
        if (!user) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,githubuser [username]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x333333, title: `GitHub — ${user}`, description: `[View Profile](https://github.com/${encodeURIComponent(user)})\n\n*API not connected.*` })] });
    }
};
