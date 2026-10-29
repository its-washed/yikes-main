const { warn } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');

const OPENAI_KEY = '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';

module.exports = {
    permission: "donator",
    data: { name: 'transcribe', description: 'Transcribe an audio file', usage: ',transcribe [url]' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        let url = args[0] || null;
        if (!url) {
            const attachment = message.attachments.first();
            if (!attachment) return warn(message, 'Usage: `transcribe <url|attachment>`');
            url = attachment.url;
        }
        message.channel.sendTyping().catch(() => {});
        try {
            const audioRes = await fetch(url);
            if (!audioRes.ok) return warn(message, 'An error occurred while downloading the audio file');
            const buffer = Buffer.from(await audioRes.arrayBuffer());
            const form = new FormData();
            form.append('file', new Blob([buffer], { type: 'audio/mpeg' }), 'audio.mp3');
            form.append('model', 'whisper-1');
            const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${OPENAI_KEY}` },
                body: form
            });
            const data = await res.json();
            const text = data.text || `Error: ${data.error ? data.error.message : 'unknown'}`;
            if (text.length > 1900) {
                return message.reply({ files: [{ attachment: Buffer.from(text, 'utf8'), name: 'transcription.txt' }] });
            }
            return message.reply({ content: text });
        } catch (e) {
            return warn(message, `An error occurred while transcribing the audio file:\n\`\`\`${e.message}\`\`\``);
        }
    }
};
