const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { warn, paginate } = require('../../utils/context');

module.exports = {
    data: { name: 'instagramstory', description: 'Gets all current stories for the given Instagram user', usage: ',instagramstory <username>' },
    aliases: ['igstory'],
    cooldown: 5,

    execute: async (message, args) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `instagramstory <username>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        try {
            const data = await getJson(`https://api.evelina.bot/instagram/story?username=${encodeURIComponent(username.toLowerCase())}`);
            const storyUrls = (data.stories || {}).urls || [];
            const storyTimes = (data.stories || {}).times || [];
            const author = (data.author || {}).username || 'unknown';
            if (!storyUrls.length || !storyTimes.length) return warnMedia(message, `Couldn't get stories from **${username}** - no stories found.`);
            if (storyUrls.length !== storyTimes.length) return warnMedia(message, `Couldn't get stories from **${username}** - mismatch between story URLs und times.`);
            const lines = storyUrls.map((storyUrl, index) => `**@${author}** — Posted <t:${Math.floor(Number(storyTimes[index]))}:R>\n(${index + 1}/${storyUrls.length}) ${storyUrl}`);
            return paginate(message, lines, `Stories of @${author}`);
        } catch (err) {
            return warnMedia(message, `Couldn't get stories from **${username}**: ${err.message}`);
        }
    }
};
