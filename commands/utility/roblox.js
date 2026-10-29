const { warn } = require('../../utils/context');
const { COLORS, EMOJIS, ICONS } = require('../../utils/styles');

module.exports = {
    data: {
        name: 'roblox',
        description: "Gets profile information on the given Roblox user",
        usage: ',roblox nike', params: ['user']
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        const username = args.join(' ').trim();
        if (!username) return warn(message, 'You must provide a username\n> Usage: `,roblox nike`');

        let data = null;
        try {
            const res = await fetch(`https://api.evelina.bot/roblox/user?username=${encodeURIComponent(username)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
            if (res.ok) data = await res.json();
        } catch (err) {
            data = null;
        }
        if (!data || data.message) return warn(message, `Couldn't get information about **${username}**`);

        const bio = String(data.bio || '').replace(/\\n/g, '\n');
        const createdAt = Number(data.created_at) * 1000;
        const markers = `${data.verified ? ` ${EMOJIS.ROBLOX_CHECKMARK}` : ''}${data.banned ? ' 🔒' : ''}`;
        const n = value => Number(value || 0).toLocaleString('en-US');

        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `${data.display_name} (@${data.username})${markers}`,
                url: data.url || null,
                description: bio || null,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                thumbnail: data.avatar_url ? { url: data.avatar_url } : undefined,
                fields: [
                    { name: 'Created', value: `<t:${Math.floor(createdAt / 1000)}:f>`, inline: false },
                    { name: 'Friends', value: n(data.friends), inline: true },
                    { name: 'Followers', value: n(data.followers), inline: true },
                    { name: 'Following', value: n(data.followings), inline: true }
                ],
                footer: { text: 'Roblox', icon_url: ICONS.ROBLOX }
            }]
        });
    }
};
