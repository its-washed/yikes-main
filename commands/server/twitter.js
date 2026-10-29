const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { needPremium } = require('../../utils/premium');
const { getJson, getBytes, rapidUrl, rapidHeaders } = require('../../utils/social');
const { blacklisted, onRatelimit, warnMedia } = require('../../utils/media');
const { COLORS } = require('../../utils/styles');

const TWITTER_COLOR = 0x1DA1F2;

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

function formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(String(value).replace(' +0000 ', ' UTC ').replace(/(\d{2}) (\w{3}) (\d{4})/, '$1 $2 $3'));
    if (Number.isNaN(date.getTime())) return 'N/A';
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getUTCDate())} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

module.exports = {
    data: { name: 'twitter', description: "Gets profile information on the given Twitter user", usage: ',twitter <username|add|remove|list|check>' },
    aliases: ['x'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'check', 'video', 'user'],
    subUsages: {
        add: ',twitter add <username> <channel> [message]',
        remove: ',twitter remove <username>',
        list: ',twitter list',
        check: ',twitter check <username>'
    },
    execute: async (message, args, client) => {
        const username = args[0];
        if (!username) return warn(message, 'Usage: `twitter <username>`');
        const data = await getJson(`https://twitter-api45.p.rapidapi.com/search.php?query=${encodeURIComponent(username)}&type=user`, rapidHeaders());
        const user = data && data.users && data.users[0];
        if (!user || String(user.screen_name).toLowerCase() !== username.toLowerCase()) {
            return warn(message, `Couldn't get information about **${username}**`);
        }
        return message.reply({
            embeds: [{
                color: TWITTER_COLOR,
                title: `${user.name} (@${user.screen_name})${user.is_blue_verified ? ' ✅' : ''}`,
                url: `https://twitter.com/${user.screen_name}/`,
                description: user.description || undefined,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL({ size: 256 }) },
                thumbnail: user.avatar ? { url: user.avatar } : undefined,
                fields: [
                    { name: 'Tweets', value: Number(user.statuses_count || 0).toLocaleString('en-US'), inline: true },
                    { name: 'Following', value: Number(user.friends_count || 0).toLocaleString('en-US'), inline: true },
                    { name: 'Followers', value: Number(user.followers_count || 0).toLocaleString('en-US'), inline: true }
                ],
                footer: { text: formatDate(user.created_at) }
            }]
        });
    },
    subs: {
        video: {
            aliases: [],
            data: { name: 'twitter video', description: 'Repost a Twitter video', usage: ',twitter video <url>' },
            execute: async (message, args) => {
                const url = args[0];
                if (!url) return warn(message, 'Usage: `twitter video <url>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const x = await getJson(`https://api.evelina.bot/twitter/media?url=${encodeURIComponent(url)}`);
                if (!x || typeof x !== 'object') return warnMedia(message, `Couldn't retrieve information about the Twitter URL\n> ${url}`);
                if (x.video && x.video.video) {
                    const caption = x.video.caption || '';
                    const author = x.author || {};
                    const buffer = await getBytes(x.video.video);
                    return message.reply({
                        embeds: [{
                            color: COLORS.TWITTER,
                            description: caption ? `[${caption}](${url})` : undefined,
                            author: { name: author.username, icon_url: author.avatar, url: `https://twitter.com/${author.username}` },
                            footer: { text: `🔖 ${(x.video.saves || 0).toLocaleString('en-US')} | ${message.author.tag}`, icon_url: 'https://cdn.evelina.bot/brands/twitter.png' }
                        }],
                        files: buffer ? [{ attachment: buffer, name: 'evelinatwitter.mp4' }] : []
                    });
                }
                return warnMedia(message, `Couldn't retrieve information about the Twitter URL\n> ${url}`);
            }
        },
        user: {
            aliases: [],
            data: { name: 'twitter user', description: 'Gets profile information on the given Twitter user', usage: ',twitter user <username>' },
            execute: async (message, args) => {
                const username = args[0];
                if (!username) return warn(message, 'Usage: `twitter user <username>`');
                if (await blacklisted(message)) return;
                const data = await getJson(`https://api.evelina.bot/twitter/user?username=${encodeURIComponent(username.toLowerCase())}&key=X3pZmLq82VnHYTd6Cr9eAw`);
                if (!data || data.message !== undefined) return warnMedia(message, `Couldn't get information about **${username}**`);
                if (!data.username) return warnMedia(message, `Account **${username}** is suspended or doesn't exist`);
                let formattedDate = 'N/A';
                if (data.created_at) {
                    const date = new Date(data.created_at);
                    if (!Number.isNaN(date.getTime())) {
                        const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
                        const pad = n => String(n).padStart(2, '0');
                        formattedDate = `${pad(date.getUTCDate())} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
                    }
                }
                return message.reply({
                    embeds: [{
                        color: COLORS.TWITTER,
                        title: `${data.full_name} (@${data.username})${data.is_verified ? ' ✅' : ''}`,
                        url: `https://twitter.com/${data.username}/`,
                        description: data.bio,
                        author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                        thumbnail: { url: data.profile_pic },
                        fields: [
                            { name: 'Tweets', value: (data.posts || 0).toLocaleString('en-US'), inline: true },
                            { name: 'Following', value: (data.following || 0).toLocaleString('en-US'), inline: true },
                            { name: 'Followers', value: (data.followers || 0).toLocaleString('en-US'), inline: true }
                        ],
                        footer: { text: formattedDate, icon_url: 'https://cdn.evelina.bot/brands/twitter.png' }
                    }]
                });
            }
        },
        add: {
            aliases: [],
            data: { name: 'twitter add', description: 'Create feed for new tweets from a user', usage: ',twitter add <username> <channel> [message]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                const channel = message.mentions.channels.first();
                if (!username || !channel) return warn(message, 'Usage: `twitter add <username> <channel> [message]`');
                if (first('SELECT 1 AS ok FROM autopost_twitter WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `You've already have a notification for [**${username}**](https://x.com/${username})`);
                }
                const note = args.slice(2).join(' ').trim() || null;
                run('INSERT INTO autopost_twitter (guild_id, channel_id, username, message) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, username.toLowerCase(), note);
                let text = `Twitter notifications for [**${username}**](https://x.com/${username}) has been set in ${channel}`;
                if (note) text += `\n**With message**\n\`\`\`${note}\`\`\``;
                return approve(message, text);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'twitter remove', description: 'Remove feed for new tweets', usage: ',twitter remove <username>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `twitter remove <username>`');
                if (!first('SELECT 1 AS ok FROM autopost_twitter WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase())) {
                    return warn(message, `There is no notification set for [**${username}**](https://x.com/${username})`);
                }
                run('DELETE FROM autopost_twitter WHERE guild_id = ? AND username = ?', message.guild.id, username.toLowerCase());
                return approve(message, `Twitter notifications for [**${username}**](https://x.com/${username}) has been removed`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'twitter list', description: 'View list of every Twitter feed', usage: ',twitter list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const rows = query('SELECT * FROM autopost_twitter WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no Twitter notification set for this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    const mention = channel ? channel.toString() : `<#${row.channel_id}>`;
                    return `[**${row.username}**](https://x.com/${row.username}) - ${mention}${row.message ? `\n> ${row.message}` : ''}`;
                });
                return paginate(message, lines, 'Twitter Notifications', guildAuthor(message));
            }
        },
        check: {
            aliases: [],
            data: { name: 'twitter check', description: 'Get the latest tweet from a user', usage: ',twitter check <username>' },
            execute: async (message, args, client) => {
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `twitter check <username>`');
                const data = await getJson(rapidUrl('https://twitter-api45.p.rapidapi.com/timeline.php', { screenname: username }), rapidHeaders());
                const tweet = data && data.timeline && data.timeline[0];
                if (!tweet) return warn(message, `Couldn't get information about **${username}**`);
                const url = `https://x.com/${username}/status/${tweet.tweet_id}`;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('View Tweet').setStyle(ButtonStyle.Link).setURL(url)
                );
                const photo = tweet.media && tweet.media.photo && tweet.media.photo[0] ? tweet.media.photo[0].media_url_https : null;
                const payload = {
                    embeds: [{
                        color: TWITTER_COLOR,
                        title: `${username} tweeted! 🐦`,
                        description: (tweet.text || '').slice(0, 4000),
                        url,
                        image: photo ? { url: photo } : undefined,
                        footer: { text: 'Twitter' }
                    }],
                    components: [row]
                };
                const video = tweet.media && tweet.media.video ? tweet.media.video[0] : null;
                const variants = video && video.variants;
                const videoUrl = variants && variants.length ? variants[variants.length - 1].url : null;
                if (videoUrl && /\.mp4(\?|$)/i.test(videoUrl)) {
                    const bytes = await getBytes(videoUrl);
                    if (bytes) payload.files = [{ attachment: bytes, name: 'tweet.mp4' }];
                }
                return message.reply(payload);
            }
        }
    }
};
