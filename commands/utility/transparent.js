const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { getBytes } = require('../../utils/social');

const URL_REGEX = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\((?:[^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\([^\s()<>]+|\([^\s()<>]+\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i;

function runRembg(input, output) {
    return new Promise((resolve) => {
        const child = execFile('rembg', ['i', input, output], { timeout: 15000 }, (err) => {
            if (err) resolve(err.killed ? 'timeout' : false);
            else resolve(fs.existsSync(output));
        });
        child.on('error', () => resolve(false));
    });
}

module.exports = {
    data: { name: 'transparent', description: 'Remove background from an image', usage: ',transparent https://evelina.bot/icon.png', params: ['[image]'] },
    aliases: ['tp'],
    cooldown: 5,

    async execute(message, args) {
        let url = args.join(' ').trim();
        if (!url) {
            const attachment = message.attachments.first();
            if (!attachment) return warn(message, 'Provide an image URL or attach an image\n> Usage: `,transparent https://evelina.bot/icon.png`');
            url = attachment.url;
        }
        if (!URL_REGEX.test(url)) return warn(message, 'The image provided is not an url');

        await message.channel.sendTyping().catch(() => {});
        const bytes = await getBytes(url);
        if (!bytes) return warn(message, "Couldn't make the image **transparent**");

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transparent-'));
        const input = path.join(dir, 'transparent.png');
        const output = path.join(dir, 'transparent_output.png');
        try {
            fs.writeFileSync(input, bytes);
            const ok = await runRembg(input, output);
            if (ok === 'timeout') return warn(message, "Couldn't make the image **transparent** due to a timeout");
            if (!ok) return warn(message, "Couldn't make the image **transparent**");
            return await message.reply({ files: [{ attachment: output, name: 'transparent.png' }] });
        } catch (err) {
            return warn(message, "Couldn't make the image **transparent**");
        } finally {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) {}
        }
    }
};
