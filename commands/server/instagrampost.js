const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { warn, paginate } = require('../../utils/context');

module.exports = {
    data: { name: 'instagrampost', description: 'Fetch Instagram post from a URL', usage: ',instagrampost <url>' },
    aliases: ['igpost'],
    cooldown: 5,

    execute: async (message, args) => {
        const url = args[0];
        if (!url) return warn(message, 'Usage: `instagrampost <url>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        try {
            const data = await getJson(`https://api.evelina.bot/instagram/post?url=${encodeURIComponent(url)}`);
            const author = (data && data.author) || {};
            const username = author.username || 'unknown';
            const imageUrls = ((data && data.media) || {}).urls || [];
            const postTime = ((data && data.media) || {}).time || 0;
            if (!imageUrls.length) return warnMedia(message, `An error occurred while fetching the post from **${url}**`);
            const lines = imageUrls.map((imageUrl, index) => `**@${username}** — Posted <t:${Math.floor(postTime)}:R>\n(${index + 1}/${imageUrls.length}) ${imageUrl}`);
            return paginate(message, lines, `Posts of @${username}`);
        } catch (err) {
            return warnMedia(message, `An error occurred while fetching the post from **${url}**: ${err.message}`);
        }
    }
};
