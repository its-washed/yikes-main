const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'minecraft', description: 'Gets profile information on the given Minecraft player', usage: ',minecraft <username>' },
    aliases: [],
    cooldown: 5,

    execute: async (message, args) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `minecraft <username>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        const data = await getJson(`https://api.evelina.bot/minecraft?username=${encodeURIComponent(username)}`);
        if (!data) return warnMedia(message, `Couldn't get information about **${username}**`);
        const history = [...(data.history || [])].sort((a, b) => Number(b.changed || 0) - Number(a.changed || 0));
        const lines = history.map(entry => `**${entry.name}** - ${entry.changed ? `<t:${entry.changed}:R>` : 'Original Name'}`);
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: `${data.name}`,
                url: `https://laby.net/${data.uuid}`,
                description: lines.join('\n'),
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                thumbnail: { url: data.skin },
                footer: { text: `UUID: ${data.uuid}` }
            }]
        });
    }
};
