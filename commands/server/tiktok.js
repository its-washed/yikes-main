const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { needPremium } = require('../../utils/premium');
const { getJson, getBytes, rapidUrl, rapidHeaders } = require('../../utils/social');
const { blacklisted, onRatelimit, warnMedia, sendEmbeds } = require('../../utils/media');
const { COLORS } = require('../../utils/styles');

const TIKTOK_COLOR = 0x010101;

function humanizeNumber(value) {
    const n = Number(value) || 0;
    if (n < 1000) return `**${n}**`;
    if (n < 1000000) return `**${(n / 1000).toFixed(1)}k**`;
    if (n < 1000000000) return `**${(n / 1000000).toFixed(1)}m**`;
    return `**${(n / 1000000000).toFixed(1)}b**`;
}

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

module.exports = {
    data: { name: 'tiktok', description: "Gets profile information on the given TikTok user", usage: ',tiktok <username|add|remove|list|check>' },
    aliases: ['tt'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'check', 'video', 'user'],
    subUsages: {
        add: ',tiktok add <username> <channel> [message]',
        remove: ',tiktok remove <username>',
        list: ',tiktok list',
        check: ',tiktok check <username>'
    },
    execute: async (message, args, client) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `tiktok <username>`');
        const data = await getJson(`https://api.tempt.lol/socials/tiktok/${encodeURIComponent(username)}`,
            process.env.TIKTOK_API_KEY ? { 'X-API-KEY': process.env.TIKTOK_API_KEY } : {});
        if (!data || !data.unique_id) {
            return warn(message, `Couldn't get information about **${username}**`);
        }
        return message.reply({
            embeds: [{
                color: TIKTOK_COLOR,
                title: `${data.nickname} (@${data.unique_id})`,
                url: `https://tiktok.com/@${data.unique_id}/`,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL({ size: 256 }) },
                thumbnail: data.avatar_thumb ? { url: data.avatar_thumb } : undefined,
                fields: [
                    { name: 'Hearts', value: humanizeNumber(data.stats && data.stats.heart_count), inline: true },
                    { name: 'Following', value: humanizeNumber(data.stats && data.stats.following_count), inline: true },
                    { name: 'Followers', value: humanizeNumber(data.stats && data.stats.follower_count), inline: true }
                ],
                footer: { text: 'TikTok' }
            }]
        });
    },
    subs: {
        video: {
            aliases: [],
            data: { name: 'tiktok video', description: 'Repost a TikTok video', usage: ',tiktok video <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `tiktok video <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const x = await getJson(`https://api.evelina.bot/tiktok/media?url=${encodeURIComponent(url)}`);
                if (!x || typeof x !== 'object') return warnMedia(message, `Failed to fetch TikTok URL\n> ${url}`);
                const author = x.author || {};
                const username = author.username || 'unknown';
                const avatarUrl = author.avatar || '';
                if (x.images && x.images.length) {
                    const music = x.music || '';
                    const caption = x.caption || 'no caption';
                    const likes = x.likes || 0, comments = x.comments || 0, shares = x.shares || 0, views = x.views || 0;
                    const embeds = x.images.map((imageUrl, index) => ({
                        color: COLORS.TIKTOK,
                        description: `[${caption}](${url})\n> **Music:** [Download](${music})`,
                        author: { name: username, icon_url: avatarUrl, url: `https://tiktok.com/@${username}` },
                        image: { url: imageUrl },
                        footer: { text: `Page: ${index + 1}/${x.images.length} ・ ❤️ ${likes.toLocaleString('en-US')}  💬 ${comments.toLocaleString('en-US')}  🔗 ${shares.toLocaleString('en-US')}  👀 ${views.toLocaleString('en-US')} | ${message.author.tag}` }
                    }));
                    return sendEmbeds(message, embeds);
                }
                return warnMedia(message, `No images found in TikTok URL\n> ${url}`);
            }
        },
        user: {
            aliases: [],
            data: { name: 'tiktok user', description: 'Gets profile information on the given TikTok user', usage: ',tiktok user <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `tiktok user <username>`');
                if (await blacklisted(message)) return;
                const data = await getJson(`https://api.tempt.lol/socials/tiktok/${encodeURIComponent(username)}`, { 'X-API-KEY': '3BduE1OR97a55xU8Vg-IwfzXI4RoEaRXEHZxJ0Y_2fI' });
                if (!data) return warnMedia(message, `Couldn't get information about **${username}**`);
                return message.reply({
                    embeds: [{
                        color: COLORS.TIKTOK,
                        title: `${data.nickname} (@${data.unique_id})`,
                        url: `https://tiktok.com/@${data.unique_id}/`,
                        thumbnail: { url: data.avatar_thumb },
                        fields: [
                            { name: 'Hearts', value: humanizeNumber(data.stats.heart_count), inline: true },
                            { name: 'Following', value: humanizeNumber(data.stats.following_count), inline: true },
                            { name: 'Followers', value: humanizeNumber(data.stats.follower_count), inline: true }
                        ],
                        footer: { text: 'TikTok', icon_url: 'https://cdn.evelina.bot/brands/tiktok.png' }
                    }]
                });
            }
        },
        add: {
            aliases: [],
            data: { name: 'tiktok add', description: 'Create a new feed for a user', usage: ',tiktok add <username> <channel> [message]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                const channel = message.mentions.channels.first();
                if (!username || !channel) return warn(message, 'Usage: `tiktok add <username> <channel> [message]`');
                if (first('SELECT 1 AS ok FROM autopost_tiktok WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `You've already have a notification for **${username}**`);
                }
                const note = args.slice(2).join(' ').trim() || null;
                run('INSERT INTO autopost_tiktok (guild_id, channel_id, username, message) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, username.toLowerCase(), note);
                let text = `TikTok notifications for **${username}** has been set in ${channel}`;
                if (note) text += `\n**With message**\n\`\`\`${note}\`\`\``;
                return approve(message, text);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'tiktok remove', description: 'Removes an existing feed for a user', usage: ',tiktok remove <username>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `tiktok remove <username>`');
                if (!first('SELECT 1 AS ok FROM autopost_tiktok WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `There is no notification set for **${username}**`);
                }
                run('DELETE FROM autopost_tiktok WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase());
                return approve(message, `TikTok notifications for **${username}** has been removed`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'tiktok list', description: 'List all TikTok user feeds', usage: ',tiktok list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const rows = query('SELECT * FROM autopost_tiktok WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no TikTok notification set for this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    const mention = channel ? channel.toString() : `<#${row.channel_id}>`;
                    return `**${row.username}** - ${mention}${row.message ? `\n> ${row.message}` : ''}`;
                });
                return paginate(message, lines, 'TikTok Notifications', guildAuthor(message));
            }
        },
        check: {
            aliases: [],
            data: { name: 'tiktok check', description: 'Get the latest video from a user', usage: ',tiktok check <username>' },
            execute: async (message, args, client) => {
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `tiktok check <username>`');
                const data = await getJson(rapidUrl('https://tiktok-best-experience.p.rapidapi.com/user/feed', { user: username }), rapidHeaders());
                const video = data && data.data && data.data.item_list && data.data.item_list[0];
                if (!video) return warn(message, `Couldn't get information about **${username}**`);
                const url = (video.share_info && video.share_info.share_url) || (video.video && video.video.play_addr && video.video.play_addr.url_list && video.video.play_addr.url_list[0]) || null;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Watch Video').setStyle(ButtonStyle.Link).setURL(url || `https://tiktok.com/@${username}`)
                );
                const payload = {
                    embeds: [{
                        color: TIKTOK_COLOR,
                        title: `${username} uploaded a new video! 🎥`,
                        description: (video.desc || '').slice(0, 4000) || '*No description*',
                        url: url || undefined,
                        footer: { text: 'TikTok' }
                    }],
                    components: [row]
                };
                if (url) {
                    const bytes = await getBytes(url);
                    if (bytes) payload.files = [{ attachment: bytes, name: 'tiktok.mp4' }];
                }
                return message.reply(payload);
            }
        }
    }
};
