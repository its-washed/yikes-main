const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { needPremium } = require('../../utils/premium');
const { getJson, getBytes, rapidUrl, rapidHeaders, rapidKey } = require('../../utils/social');
const { blacklisted, onRatelimit, warnMedia, sendEmbeds } = require('../../utils/media');
const { COLORS } = require('../../utils/styles');

const INSTAGRAM_COLOR = 0xdd2a7b;

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

async function fetchPost(username) {
    if (!rapidKey()) return null;
    const data = await getJson(rapidUrl('https://social-api4.p.rapidapi.com/v1/posts', { username_or_id_or_url: username, url_embed_safe: 'true' }), rapidHeaders());
    if (!data || !data.data || !data.data.items) return null;
    for (const item of data.data.items) {
        if (!item.is_pinned) return item;
    }
    return null;
}

async function fetchPostDetails(code) {
    if (!rapidKey()) return null;
    const data = await getJson(rapidUrl('https://social-api4.p.rapidapi.com/v1/post_info', { code_or_id_or_url: code, include_insights: 'true' }), rapidHeaders());
    return data && data.data ? data.data : null;
}

module.exports = {
    data: { name: 'instagram', description: "Gets profile information on the given Instagram user", usage: ',instagram <username|add|remove|list|check>' },
    aliases: ['ig'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'check', 'video', 'post', 'posts', 'story', 'user'],
    subUsages: {
        add: ',instagram add <username> <channel> [message]',
        remove: ',instagram remove <username>',
        list: ',instagram list',
        check: ',instagram check <username>'
    },
    execute: async (message, args, client) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `instagram <username>`');
        const data = await getJson(rapidUrl('https://social-api4.p.rapidapi.com/v1/userinfo', { user: username }), rapidHeaders());
        const user = data && data.data;
        if (!user || !user.username) {
            return warn(message, `Couldn't get information about **${username}**`);
        }
        return message.reply({
            embeds: [{
                color: INSTAGRAM_COLOR,
                title: `${user.full_name || user.username} (@${user.username})${user.is_verified ? ' ✅' : ''}`,
                url: `https://instagram.com/${user.username}/`,
                description: user.biography || undefined,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL({ size: 256 }) },
                thumbnail: user.hd_profile_pic_url_info && user.hd_profile_pic_url_info.url ? { url: user.hd_profile_pic_url_info.url } : (user.profile_pic_url ? { url: user.profile_pic_url } : undefined),
                fields: [
                    { name: 'Posts', value: Number(user.media_count || 0).toLocaleString('en-US'), inline: true },
                    { name: 'Following', value: Number(user.following_count || 0).toLocaleString('en-US'), inline: true },
                    { name: 'Followers', value: Number(user.follower_count || 0).toLocaleString('en-US'), inline: true }
                ],
                footer: { text: 'Instagram' }
            }]
        });
    },
    subs: {
        video: {
            aliases: [],
            data: { name: 'instagram video', description: 'Repost an Instagram video', usage: ',instagram video <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `instagram video <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const x = await getJson(`https://api.evelina.bot/instagram/media?url=${encodeURIComponent(url)}`);
                if (x && x.video && x.video.video) {
                    const buffer = await getBytes(x.video.video);
                    const caption = x.video.caption || '';
                    const author = x.author || {};
                    const iconUrl = author.avatar === 'None' ? undefined : author.avatar;
                    const name = author.username === 'None' ? undefined : author.username;
                    const authorUrl = author.username === 'None' ? undefined : `https://instagram.com/${author.username}`;
                    return message.reply({
                        embeds: [{
                            color: COLORS.INSTAGRAM,
                            description: caption ? `[${caption}](${url})` : undefined,
                            author: { name, icon_url: iconUrl, url: authorUrl },
                            footer: { text: `❤️ ${(x.video.likes || 0).toLocaleString('en-US')}  💬 ${(x.video.comments || 0).toLocaleString('en-US')}  🔗 ${(x.video.shares || 0).toLocaleString('en-US')}  👀 ${(x.video.views || 0).toLocaleString('en-US')} | ${message.author.tag}`, icon_url: 'https://cdn.evelina.bot/brands/instagram.png' }
                        }],
                        files: buffer ? [{ attachment: buffer, name: 'evelinainstagram.mp4' }] : []
                    });
                }
                return warnMedia(message, `Couldn't retrieve information about the Instagram URL\n> ${url}`);
            }
        },
        post: {
            aliases: [],
            data: { name: 'instagram post', description: 'Repost an Instagram post', usage: ',instagram post <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `instagram post <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                try {
                    const data = await getJson(`https://api.evelina.bot/instagram/post?url=${encodeURIComponent(url)}`);
                    const author = data.author || {};
                    const username = author.username || 'unknown';
                    const imageUrls = (data.media || {}).urls || [];
                    const postTime = (data.media || {}).time || 0;
                    if (!imageUrls.length) return warnMedia(message, `An error occurred while fetching the post from **${url}**`);
                    const lines = imageUrls.map((imageUrl, index) => `**@${username}** — Posted <t:${Math.floor(postTime)}:R>\n(${index + 1}/${imageUrls.length}) ${imageUrl}`);
                    return paginate(message, lines, `Posts of @${username}`);
                } catch {
                    return warnMedia(message, `An error occurred while fetching the post from **${url}**`);
                }
            }
        },
        posts: {
            aliases: [],
            data: { name: 'instagram posts', description: 'Fetch Instagram post from a username', usage: ',instagram posts <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `instagram posts <username>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                try {
                    const data = await getJson(`https://api.evelina.bot/instagram/posts?username=${encodeURIComponent(username)}`);
                    const items = (data && data.items) || [];
                    if (!items.length) return warnMedia(message, `Couldn't get posts from **${username}**`);
                    const embeds = [];
                    const totalPosts = items.length;
                    for (let index = 0; index < items.length; index++) {
                        const item = items[index];
                        const itemAuthor = item.author || {};
                        const itemUsername = itemAuthor.username || 'unknown';
                        const avatarUrl = itemAuthor.avatar || '';
                        const caption = item.caption || '';
                        const code = item.code || '';
                        const likes = item.likes || 0;
                        const comments = item.comments || 0;
                        const media = item.media || [];
                        if (!media.length) continue;
                        for (let mediaIndex = 0; mediaIndex < media.length; mediaIndex++) {
                            const mediaItem = media[mediaIndex];
                            if (mediaItem.type !== 'image') continue;
                            embeds.push({
                                color: COLORS.INSTAGRAM,
                                description: `[${caption}](https://instagram.com/p/${code})`,
                                author: { name: itemUsername, icon_url: avatarUrl, url: `https://instagram.com/${itemUsername}` },
                                image: { url: mediaItem.url },
                                footer: { text: `Post ${index + 1}/${totalPosts} ・ Slide ${mediaIndex + 1}/${media.length} ・ ❤️ ${likes.toLocaleString('en-US')}  💬 ${comments.toLocaleString('en-US')} | ${message.author.username}` }
                            });
                        }
                    }
                    if (!embeds.length) return warnMedia(message, 'Error fetching information from the Instagram URL.');
                    return sendEmbeds(message, embeds);
                } catch {
                    return warnMedia(message, `Couldn't get images from **${username}**`);
                }
            }
        },
        story: {
            aliases: [],
            data: { name: 'instagram story', description: 'Gets all current stories for the given Instagram user', usage: ',instagram story <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `instagram story <username>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                try {
                    const data = await getJson(`https://api.evelina.bot/instagram/story?username=${encodeURIComponent(username.toLowerCase())}`);
                    const storyUrls = (data.stories || {}).urls || [];
                    const storyTimes = (data.stories || {}).times || [];
                    const author = (data.author || {}).username || 'unknown';
                    if (!storyUrls.length || !storyTimes.length) return warnMedia(message, `Couldn't get stories from **${username}** - no stories found.`);
                    if (storyUrls.length !== storyTimes.length) return warnMedia(message, 'Mismatch between story URLs and times.');
                    const lines = storyUrls.map((storyUrl, index) => `**@${author}** — Posted <t:${Math.floor(Number(storyTimes[index]))}:R>\n(${index + 1}/${storyUrls.length}) ${storyUrl}`);
                    return paginate(message, lines, `Stories of @${author}`);
                } catch {
                    return warnMedia(message, `Couldn't get stories from **${username}**`);
                }
            }
        },
        user: {
            aliases: [],
            data: { name: 'instagram user', description: 'Gets profile information on the given Instagram user', usage: ',instagram user <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `instagram user <username>`');
                if (await blacklisted(message)) return;
                const data = await getJson(`https://api.evelina.bot/instagram/user?username=${encodeURIComponent(username.toLowerCase())}&key=X3pZmLq82VnHYTd6Cr9eAw`);
                if (!data || data.message !== undefined) return warnMedia(message, `Couldn't get information about **${username}**`);
                return message.reply({
                    embeds: [{
                        color: COLORS.INSTAGRAM,
                        title: `${data.full_name} (@${data.username})${data.is_verified ? ' ✅' : ''}`,
                        url: `https://instagram.com/${data.username}/`,
                        description: data.bio,
                        author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                        thumbnail: { url: data.profile_pic },
                        fields: [
                            { name: 'Posts', value: (data.posts || 0).toLocaleString('en-US'), inline: true },
                            { name: 'Following', value: (data.following || 0).toLocaleString('en-US'), inline: true },
                            { name: 'Followers', value: (data.followers || 0).toLocaleString('en-US'), inline: true }
                        ],
                        footer: { text: 'Instagram', icon_url: 'https://cdn.evelina.bot/brands/instagram.png' }
                    }]
                });
            }
        },
        add: {
            aliases: [],
            data: { name: 'instagram add', description: 'Create a new feed for a user', usage: ',instagram add <username> <channel> [message]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                const channel = message.mentions.channels.first();
                if (!username || !channel) return warn(message, 'Usage: `instagram add <username> <channel> [message]`');
                if (first('SELECT 1 AS ok FROM autopost_instagram WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `You've already have a notification for [**${username}**](https://instagram.com/${username})`);
                }
                const note = args.slice(2).join(' ').trim() || null;
                run('INSERT INTO autopost_instagram (guild_id, channel_id, username, message) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, username.toLowerCase(), note);
                let text = `Instagram notifications for [**${username}**](https://instagram.com/${username}) has been set in ${channel}`;
                if (note) text += `\n**With message**\n\`\`\`${note}\`\`\``;
                return approve(message, text);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'instagram remove', description: 'Removes an existing feed for a user', usage: ',instagram remove <username>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `instagram remove <username>`');
                if (!first('SELECT 1 AS ok FROM autopost_instagram WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `There is no notification set for [**${username}**](https://instagram.com/${username})`);
                }
                run('DELETE FROM autopost_instagram WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase());
                return approve(message, `Instagram notifications for [**${username}**](https://instagram.com/${username}) has been removed`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'instagram list', description: 'View list of every Instagram feed', usage: ',instagram list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const rows = query('SELECT * FROM autopost_instagram WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no Instagram notification set for this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    const mention = channel ? channel.toString() : `<#${row.channel_id}>`;
                    return `[**${row.username}**](https://instagram.com/${row.username}) - ${mention}${row.message ? `\n> ${row.message}` : ''}`;
                });
                return paginate(message, lines, 'Instagram Notifications', guildAuthor(message));
            }
        },
        check: {
            aliases: [],
            data: { name: 'instagram check', description: 'Get the latest post from a user', usage: ',instagram check <username>' },
            execute: async (message, args, client) => {
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `instagram check <username>`');
                const post = await fetchPost(username);
                if (!post) return warn(message, `Couldn't get information about **${username}**`);
                const url = `https://instagram.com/p/${post.code}`;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('View Post').setStyle(ButtonStyle.Link).setURL(url)
                );
                const payload = {
                    embeds: [{
                        color: INSTAGRAM_COLOR,
                        title: `${username} posted! 📸`,
                        description: post.caption && post.caption.text ? post.caption.text.slice(0, 4000) : undefined,
                        url,
                        footer: { text: 'Instagram' }
                    }],
                    components: [row]
                };
                const details = await fetchPostDetails(post.code);
                if (details) {
                    if (details.is_video && details.video_url) {
                        const bytes = await getBytes(details.video_url);
                        if (bytes) payload.files = [{ attachment: bytes, name: 'instagram.mp4' }];
                    } else if (details.image_versions && details.image_versions.items && details.image_versions.items[0]) {
                        const bytes = await getBytes(details.image_versions.items[0].url);
                        if (bytes) payload.files = [{ attachment: bytes, name: 'instagram.png' }];
                    }
                }
                return message.reply(payload);
            }
        }
    }
};
