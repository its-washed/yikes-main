const { warn } = require('../../utils/context');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const { getBytes } = require('../../utils/social');

module.exports = {
    data: { name: 'compress', description: 'Compress or resize an image or GIF based on percentage', usage: ',compress 50 https://evelina.bot/icon.png', params: ['percentage', '[image]'] },
    aliases: ['resize'],
    cooldown: 5,

    async execute(message, args) {
        const percentage = Number(String(args[0] || '').replace(/[^\d.-]/g, ''));
        if (!percentage || percentage < 10 || percentage > 250) {
            return warn(message, 'Please provide a percentage between **10** and **250**\n> Usage: `,compress 50 https://evelina.bot/icon.png`');
        }

        let url = args.slice(1).join(' ').trim();
        if (!url) {
            const attachment = message.attachments.first();
            if (!attachment) return warn(message, 'Provide an image URL or attach an image\n> Usage: `,compress 50 <url>`');
            url = attachment.url;
        }

        await message.channel.sendTyping().catch(() => {});
        try {
            const bytes = await getBytes(url);
            if (!bytes) throw new Error('download failed');
            const image = await loadImage(bytes);
            const scale = percentage / 100;
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, width, height);
            const out = canvas.toBuffer('image/png');
            return await message.reply({ files: [{ attachment: out, name: 'resized_image.png' }] });
        } catch (err) {
            return warn(message, `An error occurred while processing the image: ${err.message}`);
        }
    }
};
