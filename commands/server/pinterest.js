const { warn } = require('../../utils/context');
const { getJson, getBytes } = require('../../utils/social');
const { blacklisted, onRatelimit, warnMedia } = require('../../utils/media');
const { COLORS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');

module.exports = {
    data: { name: 'pinterest', description: 'Pinterest related commands', usage: ',pinterest <video>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['video'],
    subUsages: {
        video: ',pinterest video <url>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        video: {
            aliases: [],
            data: { name: 'pinterest video', description: 'Repost a Pinterest video', usage: ',pinterest video <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `pinterest video <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                try {
                    const x = await getJson(`https://api.evelina.bot/pinterest/media?url=${encodeURIComponent(url)}`);
                    if ((x.type === 'image' || x.type === 'video') && x.data && x.data.url) {
                        const buffer = await getBytes(x.data.url);
                        const description = x.data.title ? `[${x.data.title}](${url})` : '';
                        return message.reply({
                            embeds: [{
                                color: COLORS.PINTEREST,
                                description: description || undefined,
                                footer: { text: `${message.author.tag}`, icon_url: 'https://cdn.evelina.bot/brands/pinterest.png' }
                            }],
                            files: buffer ? [{ attachment: buffer, name: x.type === 'video' ? 'evelinapinterest.mp4' : 'evelinapinterest.png' }] : []
                        });
                    }
                    return warnMedia(message, `Couldn't get information about ${url}`);
                } catch {
                    return warnMedia(message, `Failed to fetch Pinterest URL\n> ${url}`);
                }
            }
        }
    }
};
