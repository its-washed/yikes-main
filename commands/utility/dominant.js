const { loadImage, createCanvas } = require('@napi-rs/canvas');
const { warn } = require('../../utils/context');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const EMOJI_RE = /^<a?:(\w+):(\d+)>$/;
const URL_RE = /^https?:\/\//;

function emojiUrl(input) {
    const match = EMOJI_RE.exec(input.trim());
    if (!match) return null;
    const animated = input.startsWith('<a');
    return `https://cdn.discordapp.com/emojis/${match[2]}.${animated ? 'gif' : 'png'}`;
}

async function fetchBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

async function dominantColor(buffer) {
    const img = await loadImage(buffer);
    const width = Math.min(img.width, 512);
    const height = Math.min(img.height, 512);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 125) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const entry = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        entry.count++;
        entry.r += r;
        entry.g += g;
        entry.b += b;
        buckets.set(key, entry);
    }
    if (!buckets.size) throw new Error('no pixels');

    let best = null;
    for (const entry of buckets.values()) {
        if (!best || entry.count > best.count) best = entry;
    }
    const r = Math.round(best.r / best.count);
    const g = Math.round(best.g / best.count);
    const b = Math.round(best.b / best.count);
    return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

async function resolveInput(message, args) {
    if (args.length) {
        const input = args.join(' ').trim();
        const asEmoji = emojiUrl(input);
        if (asEmoji) return asEmoji;
        if (URL_RE.test(input)) return input;
        return { error: 'Invalid input. Please provide a valid emoji or URL.' };
    }

    const attachment = message.attachments.first();
    if (attachment) return attachment.url;

    if (message.reference) {
        const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (ref) {
            const refAttachment = ref.attachments.first();
            if (refAttachment) return refAttachment.url;
            const emojis = (ref.content || '').match(/<a?:\w+:\d+>/g);
            if (emojis && emojis.length) {
                const url = emojiUrl(emojis[0]);
                if (url) return url;
            }
        }
    }
    return { error: 'Usage: `dominant <emoji|url>` — or send it as an attachment / reply to one.' };
}

module.exports = {
    data: { name: 'dominant', description: 'Grab the most dominant color from an image, emoji, or URL', usage: ',dominant <emoji|url>' },
    aliases: ['hex'],
    cooldown: 5,

    async execute(message, args) {
        const source = await resolveInput(message, args);
        if (typeof source === 'object' && source.error) return warn(message, source.error);

        let hex;
        try {
            const buffer = await fetchBuffer(source);
            hex = await dominantColor(buffer);
        } catch (err) {
            return message.reply({ embeds: [errorEmbed('Image Failed', `Couldn't read that image (${err.message})`)] });
        }

        let info = null;
        try {
            const res = await fetch(`https://www.thecolorapi.com/id?hex=${hex}`);
            if (res.ok) info = await res.json();
        } catch (err) {}

        const swatch = `https://singlecolorimage.com/get/${hex}/200x200`;
        const name = info && info.name && info.name.value ? info.name.value : `#${hex.toUpperCase()}`;
        const rgb = info && info.rgb && info.rgb.value
            ? info.rgb.value
            : parseInt(hex.slice(0, 2), 16) + ', ' + parseInt(hex.slice(2, 4), 16) + ', ' + parseInt(hex.slice(4, 6), 16);

        return message.reply({
            embeds: [createEmbed({
                color: parseInt(hex, 16),
                author: { name, icon_url: swatch },
                thumbnail: swatch,
                fields: [
                    { name: 'RGB', value: rgb, inline: true },
                    { name: 'HEX', value: `#${hex.toUpperCase()}`, inline: true }
                ],
                timestamp: false
            })]
        });
    }
};
