const { COLORS, EMOJIS } = require('../../utils/styles');
const { getJson, getBytes } = require('../../utils/social');

const SHAZAM_API = process.env.SHAZAM_API || '';

module.exports = {
    data: { name: 'shazam', description: 'Find a song by providing video or audio', usage: ',shazam (attach audio/video)', params: ['[media]'] },
    aliases: [],
    cooldown: 10,

    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment) {
            return message.reply({
                embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Please attach an audio or video file` }]
            });
        }
        const mes = await message.reply({
            embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Searching for track...` }]
        });
        try {
            const bytes = await getBytes(attachment.url);
            if (!bytes) throw new Error('download failed');

            const form = new FormData();
            form.append('file', new Blob([bytes]), 'audio');
            const res = await fetch(SHAZAM_API || 'https://api.evelina.bot/shazam', { method: 'POST', body: form });
            const out = await res.json();
            const track = out.track.share.text;
            const link = out.track.share.href;
            await mes.edit({
                embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.APPROVE} ${message.author}: Found [**${track}**](${link})` }]
            });
        } catch (err) {
            await mes.edit({
                embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Unable to find this attachment's track name` }]
            });
        }
    }
};
