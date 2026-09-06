const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'github',
        description: 'GitHub user info',
        usage: ',github [username]'
    },
    aliases: ['gh'],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,github [username]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x333333,
                title: `GitHub — ${username}`,
                description: `[View Profile](https://github.com/${encodeURIComponent(username)})\n\n*GitHub API not connected.*`
            })]
        });
    }
};
