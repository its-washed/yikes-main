const path = require('path');
const os = require('os');
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { warn } = require('../../utils/context');
const { getBytes } = require('../../utils/social');

function extractTextAndUrl(input) {
    const urlMatch = input.match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : null;
    const text = url ? input.replace(url, '').trim() : input.trim();
    return { text: text || 'pls god strike this man down', url };
}

async function captionImage(imgBytes, text) {
    const img = await loadImage(imgBytes);
    const fontSize = Math.max(Math.floor(img.height * 0.07), 30);
    const maxWidth = img.width - 40;
    const measure = createCanvas(1, 1).getContext('2d');
    measure.font = `${fontSize}px sans-serif`;
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (measure.measureText(test).width <= maxWidth || !current) current = test;
        else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    const lineHeight = fontSize;
    const minBarHeight = Math.floor(img.height * 0.15);
    const barHeight = Math.max(minBarHeight, lineHeight * lines.length + 20);
    const canvas = createCanvas(img.width, img.height + barHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, barHeight);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.floor((barHeight - totalTextHeight) / 2);
    lines.forEach((line, index) => {
        const width = ctx.measureText(line).width;
        ctx.fillText(line, Math.floor((img.width - width) / 2), startY + index * lineHeight);
    });
    return canvas.toBuffer('image/png');
}

function fontFile() {
    const candidates = process.platform === 'win32'
        ? ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf']
        : ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

async function captionGif(gifBytes, text) {
    let ffmpeg = null;
    try {
        ffmpeg = require('ffmpeg-static');
    } catch {
        return null;
    }
    if (!ffmpeg) return null;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caption-'));
    const inputPath = path.join(dir, 'in.gif');
    const outputPath = path.join(dir, 'out.gif');
    fs.writeFileSync(inputPath, gifBytes);
    const escaped = String(text).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%').replace(/,/g, '\\,');
    const vf = `pad=w=iw:h=ih+100:x=0:y=100:color=white,drawtext=text='${escaped}':fontcolor=black:fontsize=30:x=(w-text_w)/2:y=ih-90`;
    const { execFileSync } = require('child_process');
    try {
        const font = fontFile();
        const args = ['-y', '-i', inputPath, '-vf', font ? `${vf}:fontfile=${font}` : vf, '-loop', '0', outputPath];
        execFileSync(ffmpeg, args, { stdio: 'ignore', timeout: 30000 });
        const out = fs.readFileSync(outputPath);
        fs.rmSync(dir, { recursive: true, force: true });
        return out;
    } catch {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {
        }
        return null;
    }
}

module.exports = {
    data: { name: 'caption', description: "Add a caption to an image", usage: ',caption <text> [url|attachment|reply]' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const input = args.join(' ').trim();
        let { text, url } = extractTextAndUrl(input || 'pls god strike this man down');
        let imgBytes = null;
        let isGif = false;
        if (!url && message.attachments.size) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                imgBytes = Buffer.from(await (await fetch(attachment.url)).arrayBuffer());
                isGif = Boolean(attachment.contentType.includes('gif') || /\.gif$/i.test(attachment.name || ''));
            } else {
                return warn(message, 'The uploaded file is not an Image/GIF!');
            }
        }
        if (!imgBytes && !url && message.reference) {
            const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (refMsg) {
                if (refMsg.attachments.size) {
                    const att = refMsg.attachments.first();
                    imgBytes = Buffer.from(await (await fetch(att.url)).arrayBuffer());
                    isGif = Boolean(/\.gif$/i.test(att.name || ''));
                } else if (refMsg.content) {
                    const match = refMsg.content.match(/https?:\/\/\S+/);
                    if (match) url = match[0];
                }
                if (!imgBytes && !url && refMsg.stickers && refMsg.stickers.first()) {
                    url = refMsg.stickers.first().url;
                }
            }
        }
        if (!imgBytes && url) return this.executeWithUrl(message, url, text);
        if (!imgBytes) return warn(message, 'You must provide an image/GIF via attachment, link, or reply.');
        if (isGif) {
            const out = await captionGif(imgBytes, text);
            if (!out) return warn(message, 'The file could not be processed as an image/GIF.');
            return message.reply({ files: [{ attachment: out, name: 'caption.gif' }] });
        }
        try {
            const out = await captionImage(imgBytes, text);
            return message.reply({ files: [{ attachment: out, name: 'caption.gif' }] });
        } catch {
            return warn(message, 'The file could not be processed as an image/GIF.');
        }
    },

    async executeWithUrl(message, url, text) {
        if (url.includes('tenor.com/view')) {
            const tenorGif = await this.getGifFromTenor(url);
            if (!tenorGif) return warn(message, "Couldn't extract Tenor GIF.");
            url = tenorGif;
        }
        const bytes = await getBytes(url);
        if (!bytes) return warn(message, 'Failed to download the image or file is not a valid image.');
        const isGif = /\.gif(\?|$)/i.test(url);
        if (isGif) {
            const out = await captionGif(bytes, text);
            if (!out) return warn(message, 'The file could not be processed as an image/GIF.');
            return message.reply({ files: [{ attachment: out, name: 'caption.gif' }] });
        }
        try {
            const out = await captionImage(bytes, text);
            return message.reply({ files: [{ attachment: out, name: 'caption.gif' }] });
        } catch {
            return warn(message, 'The file could not be processed as an image/GIF.');
        }
    },

    async getGifFromTenor(url) {
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) return null;
            const html = await res.text();
            const match = html.match(/https:\/\/media\.tenor\.com\/[^\"'\s]+\.gif/g);
            return match && match.length ? match[0] : null;
        } catch (err) {
            return null;
        }
    }
};
