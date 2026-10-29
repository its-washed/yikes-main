const { warn } = require('../../utils/context');
const { parseEmoji, emojiUrl, fetchBytes, svgToPng } = require('../../utils/emojiTools');

module.exports = {
    data: { name: 'enlarge', description: 'Get an image version of an emoji', usage: ',enlarge <emoji|text>' },
    aliases: ['e', 'jumbo'],
    cooldown: 5,

    execute: async (message, args) => {
        const token = args.join(' ').trim();
        if (!token) return warn(message, 'Usage: `enlarge <emoji|text>`');
        const parsed = parseEmoji(token);
        if (parsed) {
            const bytes = await fetchBytes(emojiUrl(parsed));
            if (!bytes) return warn(message, 'This is **not** an emoji');
            return message.reply({ files: [{ attachment: bytes, name: `${parsed.name}.${parsed.animated ? 'gif' : 'png'}` }] });
        }
        if (token.startsWith('<')) return warn(message, 'This is **not** an emoji');
        const chars = [];
        const names = [];
        for (const char of token) {
            chars.push(char.codePointAt(0).toString(16));
            names.push(char.trim() ? char.trim().toUpperCase() : 'none');
        }
        if (chars.length === 2 && chars.includes('fe0f')) chars.splice(chars.indexOf('fe0f'), 1);
        if (chars.includes('20e3')) chars.splice(chars.indexOf('fe0f'), 1);
        const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${chars.join('-')}.svg`;
        const svg = await fetchBytes(url);
        if (!svg) return warn(message, `[This is **not** an emoji](${url})`);
        let png;
        try {
            png = await svgToPng(svg);
        } catch (err) {
            return warn(message, 'Image Creation **Timed Out**');
        }
        return message.reply({ files: [{ attachment: png, name: `${names.join('_')}.png` }] });
    }
};
