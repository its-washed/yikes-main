const { blacklisted, warnMedia, onRatelimit, sendEmbeds } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'instagramposts', description: 'Fetch Instagram post from a username', usage: ',instagramposts <username>' },
    aliases: ['igposts'],
    cooldown: 5,

    execute: async (message, args) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `instagramposts <username>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        try {
            const data = await getJson(`https://api.evelina.bot/instagram/posts?username=${encodeURIComponent(username)}`);
            const items = (data && data.items) || [];
            if (!items.length) return warnMedia(message, `Couldn't get posts from **${username}**`);
            const embeds = [];
            const totalPosts = items.length;
            for (let index = 0; index < items.length; index++) {
                const item = items[index];
                const itemAuthor = item.author || {};
                const itemUsername = itemAuthor.username || 'unknown';
                const avatarUrl = itemAuthor.avatar || '';
                const caption = item.caption || '';
                const code = item.code || '';
                const likes = item.likes || 0;
                const comments = item.comments || 0;
                const media = item.media || [];
                if (!media.length) continue;
                for (let mediaIndex = 0; mediaIndex < media.length; mediaIndex++) {
                    const mediaItem = media[mediaIndex];
                    if (mediaItem.type !== 'image') continue;
                    embeds.push({
                        color: COLORS.INSTAGRAM,
                        description: `[${caption}](https://instagram.com/p/${code})`,
                        author: { name: itemUsername, icon_url: avatarUrl, url: `https://instagram.com/${itemUsername}` },
                        image: { url: mediaItem.url },
                        footer: { text: `Post ${index + 1}/${totalPosts} ・ Slide ${mediaIndex + 1}/${media.length} ・ ❤️ ${likes.toLocaleString('en-US')}  💬 ${comments.toLocaleString('en-US')} | ${message.author.username}` }
                    });
                }
            }
            if (!embeds.length) return warnMedia(message, 'Error fetching information from the Instagram URL.');
            return sendEmbeds(message, embeds);
        } catch (err) {
            return warnMedia(message, `Couldn't get images from **${username}**`);
        }
    }
};
