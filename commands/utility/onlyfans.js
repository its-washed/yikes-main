const { warn } = require('../../utils/context');
const { blacklisted, onRatelimit, warnMedia, getJson, sendEmbeds } = require('../../utils/media');

const ONLYFANS_COLOR = 0x00aff0;

function mediaUrl(item) {
    if (!item) return null;
    if (typeof item === 'string') return item;
    const candidates = [
        item.mediaUrl, item.media_url, item.media, item.video, item.videoUrl, item.video_url,
        item.imageUrl, item.image_url, item.image, item.preview, item.cover, item.thumb, item.thumbnail
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) return candidate;
    }
    const previews = item.previews || item.previewUrls || item.media || [];
    if (Array.isArray(previews) && previews.length) {
        const first = previews[0];
        if (typeof first === 'string' && /^https?:\/\//.test(first)) return first;
        if (first && typeof first.url === 'string') return first.url;
    }
    if (item.image && typeof item.image.url === 'string') return item.image.url;
    return null;
}

module.exports = {
    data: { name: 'onlyfans', description: 'Gets all current posts for the given Onlyfans user', usage: ',onlyfans <username>' },
    aliases: ['of'],
    cooldown: 10,

    async execute(message, args) {
        const username = (args[0] || '').replace(/^@/, '').trim();
        if (!username) return warn(message, 'Usage: `onlyfans <username>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;

        let data;
        try {
            data = await getJson(`https://api.evelina.bot/onlyfans/posts?username=${encodeURIComponent(username)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
        } catch (err) {
            return warnMedia(message, `Couldn't get posts for **${username}**`);
        }

        const items = Array.isArray(data)
            ? data
            : (data && (data.items || data.posts || data.data || data.results)) || [];
        if (!Array.isArray(items) || !items.length) {
            return warnMedia(message, `Couldn't get posts for **${username}**`);
        }

        const embeds = [];
        const total = items.length;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const url = mediaUrl(item);
            if (!url) continue;
            const caption = item.text || item.caption || item.title || '';
            embeds.push({
                color: ONLYFANS_COLOR,
                description: caption || undefined,
                author: { name: username, url: `https://onlyfans.com/${username}` },
                image: { url },
                footer: { text: `Post ${i + 1}/${total} | ${message.author.username}` }
            });
        }

        if (!embeds.length) return warnMedia(message, `Couldn't get posts for **${username}**`);
        return sendEmbeds(message, embeds);
    }
};
