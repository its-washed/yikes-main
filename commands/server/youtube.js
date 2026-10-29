const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { needPremium } = require('../../utils/premium');
const { getJson, rapidUrl, rapidHeaders, rapidKey } = require('../../utils/social');
const { sendCard } = require('../../utils/helpCard');

const YOUTUBE_COLOR = 0xFF0000;

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

async function fetchChannel(username) {
    if (!rapidKey()) return null;
    const data = await getJson(rapidUrl('https://youtube-v2.p.rapidapi.com/channel/id', { channel_name: username }), rapidHeaders());
    return data && data.channel_id ? data.channel_id : null;
}

module.exports = {
    data: { name: 'youtube', description: 'Manage YouTube notifications', usage: ',youtube <add|remove|list|check>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'check'],
    subUsages: {
        add: ',youtube add <username> <channel> [message]',
        remove: ',youtube remove <username>',
        list: ',youtube list',
        check: ',youtube check <username>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'youtube add', description: 'Enable post notifications for a channel', usage: ',youtube add <username> <channel> [message]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                const channel = message.mentions.channels.first();
                if (!username || !channel) return warn(message, 'Usage: `youtube add <username> <channel> [message]`');
                const channelId = await fetchChannel(username);
                if (!channelId) return warn(message, `Couldn't get information about **${username}**`);
                if (first('SELECT 1 AS ok FROM autopost_youtube WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `You've already have a notification for **${username}**`);
                }
                const note = args.slice(2).join(' ').trim() || null;
                run('INSERT INTO autopost_youtube (guild_id, channel_id, username, message) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, username, note);
                let text = `YouTube notifications for **${username}** has been set in ${channel}`;
                if (note) text += `\n**With message**\n\`\`\`${note}\`\`\``;
                return approve(message, text);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'youtube remove', description: 'Disable post notifications for a channel', usage: ',youtube remove <username>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const username = args[0];
                if (!username) return warn(message, 'Usage: `youtube remove <username>`');
                const channelId = await fetchChannel(username);
                if (!channelId) return warn(message, `Couldn't get information about **${username}**`);
                if (!first('SELECT 1 AS ok FROM autopost_youtube WHERE guild_id = ? AND channel_id = ?', message.guild.id, channelId)) {
                    return warn(message, 'There is no notification set for **' + username + '**');
                }
                run('DELETE FROM autopost_youtube WHERE guild_id = ? AND channel_id = ?', message.guild.id, channelId);
                return approve(message, `YouTube notifications for **${username}** has been removed`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'youtube list', description: 'View all YouTube post notifications', usage: ',youtube list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const rows = query('SELECT * FROM autopost_youtube WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no YouTube notification set for this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    const mention = channel ? channel.toString() : `<#${row.channel_id}>`;
                    return `**${row.username}** - ${mention}${row.message ? `\n> ${row.message}` : ''}`;
                });
                return paginate(message, lines, 'YouTube Notifications', guildAuthor(message));
            }
        },
        check: {
            aliases: [],
            data: { name: 'youtube check', description: 'Get the latest video from a channel', usage: ',youtube check <username>' },
            execute: async (message, args, client) => {
                if (!await needPremium(message)) return;
                const username = args.length > 1 ? args.join(' ') : args[0];
                if (!username) return warn(message, 'Usage: `youtube check <username>`');
                const channelId = await fetchChannel(username);
                if (!channelId) return warn(message, `Couldn't get information about **${username}**`);
                const data = await getJson(rapidUrl('https://youtube-v2.p.rapidapi.com/channel/videos', { channel_id: channelId }), rapidHeaders());
                const video = data && data.videos && data.videos[0];
                if (!video) return warn(message, `Couldn't get information about **${username}**`);
                const url = `https://youtube.com/watch?v=${video.video_id}`;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Watch Video').setStyle(ButtonStyle.Link).setURL(url)
                );
                const thumb = video.thumbnails && video.thumbnails.length
                    ? String(video.thumbnails[video.thumbnails.length - 1].url || '').replace('{width}', '640').replace('{height}', '360')
                    : null;
                return message.reply({
                    embeds: [{
                        color: YOUTUBE_COLOR,
                        title: `${username} uploaded a new video! 🎥`,
                        description: (video.title || '').slice(0, 4000),
                        url,
                        image: thumb ? { url: thumb } : undefined,
                        footer: { text: 'YouTube' }
                    }],
                    components: [row]
                });
            }
        }
    }
};
