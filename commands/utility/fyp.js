const { AttachmentBuilder } = require('discord.js');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { getJson, getBytes } = require('../../utils/social');

const API_KEY = 'X3pZmLq82VnHYTd6Cr9eAw';

module.exports = {
    data: { name: 'fyp', description: 'Repost a TikTok video from the FYP', usage: ',fyp' },
    aliases: ['foryou', 'foryoupage'],
    cooldown: 5,

    async execute(message) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const x = await getJson(`https://api.evelina.bot/tiktok/fyp?key=${API_KEY}`);
            if (x && x.video && x.video.video) {
                const video = x.video.video;
                const bytes = await getBytes(video);
                if (!bytes) break;
                const caption = x.video.caption || '';
                const description = caption ? `[${caption}](${video})` : '';
                const author = x.author || {};
                const stats = x.video;
                const embed = {
                    color: COLORS.NEUTRAL,
                    description,
                    author: {
                        name: author.username || 'TikTok',
                        icon_url: author.avatar || undefined,
                        url: author.username ? `https://tiktok.com/@${author.username}` : undefined
                    },
                    footer: {
                        text: `❤️ ${Number(stats.likes || 0).toLocaleString()}  💬 ${Number(stats.comments || 0).toLocaleString()}  🔗 ${Number(stats.shares || 0).toLocaleString()}  👀 ${Number(stats.views || 0).toLocaleString()} | ${message.author.tag}`
                    }
                };
                const file = new AttachmentBuilder(bytes, { name: 'evelinatiktok.mp4' });
                return message.reply({ embeds: [embed], files: [file] });
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return warn(message, 'Failed to fetch a TikTok video from the FYP');
    }
};
