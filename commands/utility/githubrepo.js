const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'githubrepo', description: 'Get GitHub repo info', usage: ',githubrepo [user/repo]' },
    aliases: ['ghrepo'],
    cooldown: 10,
    async execute(message, args) {
        const repo = args[0];
        if (!repo) return message.reply({ embeds: [errorEmbed('Missing Repo', 'Usage: ,githubrepo [user/repo]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x333333, title: `GitHub — ${repo}`, description: `[View Repository](https://github.com/${repo})\n\n*API not connected.*` })] });
    }
};
