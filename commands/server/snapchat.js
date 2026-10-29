const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { getJson, getBytes } = require('../../utils/social');
const { blacklisted, onRatelimit, warnMedia } = require('../../utils/media');
const { COLORS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');

const snapData = new Map();

module.exports = {
    data: { name: 'snapchat', description: "Get bitmoji and QR scan code for user", usage: ',snapchat <video|user>' },
    aliases: ["snap"],
    cooldown: 5,
    subcommands: ['video', 'user'],
    subUsages: {
        video: ',snapchat video <url>',
        user: ',snapchat user <username>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        video: {
            aliases: [],
            data: { name: 'snapchat video', description: 'Repost a Snapchat video', usage: ',snapchat video <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `snapchat video <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const x = await getJson(`https://api.evelina.bot/snapchat/media?url=${encodeURIComponent(url)}`);
                if (x && x.video && x.video.video) {
                    const buffer = await getBytes(x.video.video);
                    const caption = x.video.caption || '';
                    const views = parseInt(x.video.views || 0, 10);
                    const author = x.author || {};
                    return message.reply({
                        embeds: [{
                            color: COLORS.SNAPCHAT,
                            description: caption ? `[${caption}](${url})` : undefined,
                            author: { name: author.username, url: `https://snapchat.com/add/${author.username}` },
                            footer: { text: `👀 ${views.toLocaleString('en-US')} | ${message.author.tag}`, icon_url: 'https://cdn.evelina.bot/brands/snapchat.png' }
                        }],
                        files: buffer ? [{ attachment: buffer, name: 'evelinasnapchat.mp4' }] : []
                    });
                }
                return warnMedia(message, `Couldn't retrieve information about the Snapchat URL\n> ${url}`);
            }
        },
        user: {
            aliases: [],
            data: { name: 'snapchat user', description: 'Get bitmoji and QR scan code for user', usage: ',snapchat user <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `snapchat user <username>`');
                if (await blacklisted(message)) return;
                const data = await getJson(`https://api.evelina.bot/snapchat/user?username=${encodeURIComponent(username)}&key=8F6qVxN55aoODT0FRh16pydP`);
                if (!data || data.message !== undefined) return warnMedia(message, `Couldn't get information about **${username}**`);
                snapData.set(message.id, data.snapcode);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`snapcode_${message.id}`).setLabel('Snapcode').setStyle(ButtonStyle.Secondary)
                );
                setTimeout(() => snapData.delete(message.id), 300000);
                return message.reply({
                    embeds: [{
                        color: COLORS.SNAPCHAT,
                        title: `${data.display_name} (@${data.username})`,
                        url: data.url,
                        description: data.bio || 'No bio available',
                        author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                        thumbnail: { url: data.avatar },
                        footer: { text: 'Snapchat', icon_url: 'https://cdn.evelina.bot/brands/snapchat.png' }
                    }],
                    components: [row]
                });
            }
        }
    }
};

module.exports.snapData = snapData;
