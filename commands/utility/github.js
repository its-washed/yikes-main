const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'github',
        description: 'Look up a GitHub user',
        usage: ',github [username]'
    },
    aliases: ['gh', 'git'],
    cooldown: 5,

    async execute(message, args) {
        const username = args[0];
        if (!username) {
            return message.reply({ embeds: [errorEmbed('Missing Username', 'Usage: ,github [username]')] });
        }

        try {
            const response = await fetch(`https://api.github.com/users/${username}`);
            if (!response.ok) return message.reply({ embeds: [errorEmbed('Not Found', `User \`${username}\` not found.`)] });

            const data = await response.json();

            return message.reply({
                embeds: [createEmbed({
                    color: 0x24292e,
                    title: data.login,
                    url: data.html_url,
                    thumbnail: { url: data.avatar_url },
                    fields: [
                        { name: 'Name', value: data.name || 'N/A', inline: true },
                        { name: 'Bio', value: data.bio || 'N/A', inline: false },
                        { name: 'Public Repos', value: `${data.public_repos}`, inline: true },
                        { name: 'Followers', value: `${data.followers}`, inline: true },
                        { name: 'Following', value: `${data.following}`, inline: true },
                        { name: 'Joined', value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`, inline: true }
                    ]
                })]
            });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
