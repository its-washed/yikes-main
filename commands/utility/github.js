const { warn } = require('../../utils/context');
const { COLORS, ICONS } = require('../../utils/styles');

module.exports = {
    data: {
        name: 'github',
        description: "Gets profile information on the given Github user",
        usage: ',github nike', params: ['user']
    },
    aliases: ["git"],
    cooldown: 10,

    async execute(message, args) {
        const username = args[0];
        if (!username) return warn(message, 'You must provide a username\n> Usage: `,github nike`');

        let data = null;
        try {
            const res = await fetch(`https://api.evelina.bot/github/user?username=${encodeURIComponent(username)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
            if (res.ok) data = await res.json();
        } catch (err) {
            data = null;
        }
        if (!data || data.message) return warn(message, `Couldn't get information about **${username}**`);

        let timestamp = null;
        try {
            const parsed = new Date(data.created);
            if (!Number.isNaN(parsed.getTime())) timestamp = parsed.toISOString();
        } catch (err) {
            timestamp = null;
        }

        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `${data.display ? data.display : ''} (@${data.username})`,
                url: `https://github.com/${data.username}/`,
                description: data.bio || null,
                timestamp,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                thumbnail: data.avatar ? { url: data.avatar } : undefined,
                fields: [
                    { name: 'Followers', value: `${data.followers}` },
                    { name: 'Following', value: `${data.following}` },
                    { name: 'Repos', value: `${data.repos}` }
                ],
                footer: { text: 'Created on', icon_url: ICONS.GITHUB }
            }]
        });
    }
};
