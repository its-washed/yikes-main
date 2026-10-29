const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { warn } = require('../../utils/context');
const { getBytes } = require('../../utils/social');

function runTesseract(input) {
    return new Promise((resolve) => {
        const child = execFile('tesseract', [input, 'stdout'], { timeout: 30000 }, (err, stdout) => {
            if (err) resolve(null);
            else resolve(stdout);
        });
        child.on('error', () => resolve(null));
    });
}

module.exports = {
    data: { name: 'ocr', description: 'Perform OCR on an image or an attached image', usage: ',ocr image', params: ['[image]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        let bytes = null;
        if (message.attachments.first()) {
            bytes = Buffer.from(await (await fetch(message.attachments.first().url)).arrayBuffer()).catch(() => null);
        }
        const url = args.join(' ').trim();
        if (!bytes && url) bytes = await getBytes(url);
        if (!bytes) return warn(message, url ? 'Failed to download the image.' : 'Please provide either an image URL or attach an image.');

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));
        const file = path.join(dir, 'ocr.png');
        try {
            fs.writeFileSync(file, bytes);
            const text = await runTesseract(file);
            if (text === null) return warn(message, 'OCR is not available on this host');
            return message.reply({ content: text.trim() || 'No text found' });
        } catch (err) {
            return warn(message, 'An error occurred while performing OCR');
        } finally {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) {}
        }
    }
};
