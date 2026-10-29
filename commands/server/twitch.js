const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { needPremium } = require('../../utils/premium');
const { sendCard } = require('../../utils/helpCard');

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

function streamerName(value) {
    const raw = String(value || '');
    if (/^https?:\/\/(www\.)?twitch\.tv\//i.test(raw)) {
        return raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').split(/[/?#]/)[0];
    }
    return raw;
}

function streamerLink(streamer) {
    return `[\*\*${streamer}\*\*](https://twitch.tv/${streamer})`;
}


let twitchToken = null;
let twitchTokenExpiry = 0;

async function getTwitchToken() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    if (twitchToken && Date.now() < twitchTokenExpiry) return twitchToken;

    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`, { method: 'POST' });
    if (!res.ok) throw new Error(`token request failed (${res.status})`);
    const data = await res.json();
    twitchToken = data.access_token;
    twitchTokenExpiry = Date.now() + Math.max(60, (data.expires_in || 3600) - 60) * 1000;
    return twitchToken;
}


async function fetchStreamData(streamer) {
    const token = await getTwitchToken();
    if (!token) return undefined;
    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(streamer)}`, {
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID,
            Authorization: `Bearer ${token}`
        }
    });
    if (res.status === 401) {
        twitchToken = null;
        return fetchStreamData(streamer);
    }
    if (!res.ok) throw new Error(`helix responded ${res.status}`);
    const json = await res.json();
    return json.data && json.data.length ? json.data[0] : null;
}

module.exports = {
    permission: "manage server",
    data: { name: 'twitch', description: "Twitch command group", usage: ',twitch <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list', 'check'],
    subUsages: {
        add: ',twitch add <streamer> <channel> [message]',
        remove: ',twitch remove <streamer>',
        list: ',twitch list',
        check: ',twitch check <streamer>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'twitch add', description: 'Add stream notifications to channel', usage: ',twitch add <streamer> <channel> [message]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const streamer = streamerName(args[0]);
                const channel = message.mentions.channels.first();
                if (!streamer || !channel) return warn(message, 'Usage: `twitch add <streamer> <channel> [message]`');
                if (first('SELECT 1 AS ok FROM autopost_twitch WHERE guild_id = ? AND streamer = ?', message.guild.id, streamer.toLowerCase())) {
                    return warn(message, `You've already have a notification for ${streamerLink(streamer)}`);
                }
                const note = args.slice(2).join(' ').trim() || null;
                run('INSERT INTO autopost_twitch (guild_id, channel_id, streamer, message) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, streamer.toLowerCase(), note);
                let text = `Stream notifications for ${streamerLink(streamer)} has been set in ${channel}`;
                if (note) text += `\n**With message**\n\`\`\`${note}\`\`\``;
                return approve(message, text);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'twitch remove', description: 'Remove stream notifications from a channel', usage: ',twitch remove <streamer>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const streamer = streamerName(args[0]);
                if (!streamer) return warn(message, 'Usage: `twitch remove <streamer>`');
                if (!first('SELECT 1 AS ok FROM autopost_twitch WHERE guild_id = ? AND streamer = ?', message.guild.id, streamer.toLowerCase())) {
                    return warn(message, `There is no configured notification for ${streamerLink(streamer)}`);
                }
                run('DELETE FROM autopost_twitch WHERE guild_id = ? AND streamer = ?', message.guild.id, streamer.toLowerCase());
                return approve(message, `${streamerLink(streamer)} has been removed from twitch notifications`);
            }
        },
        check: {
            aliases: [],
            data: { name: 'twitch check', description: 'Check if a streamer is currently live', usage: ',twitch check <streamer>' },
            execute: async (message, args) => {
                if (!await needPremium(message)) return;
                const streamer = streamerName(args[0]);
                if (!streamer) return warn(message, 'Usage: `twitch check <streamer>`');

                let stream;
                try {
                    stream = await fetchStreamData(streamer);
                } catch (err) {
                    return warn(message, `Couldn't reach the Twitch API (${err.message})`);
                }
                if (stream === undefined) {
                    return warn(message, 'Twitch API credentials are not configured\n> Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` in `.env`');
                }
                if (!stream) return warn(message, `${streamerLink(streamer)} is currently not live`);

                const embed = new EmbedBuilder()
                    .setColor(0x6441a5)
                    .setTitle(`${streamer} is now live! 🎥`)
                    .setURL(`https://twitch.tv/${streamer}`)
                    .setDescription(stream.title || '')
                    .setTimestamp()
                    .addFields(
                        { name: '👀 Viewers', value: String(stream.viewer_count ?? 0), inline: true },
                        { name: '🎮 Game', value: stream.game_name || 'Unknown', inline: true }
                    );
                if (stream.thumbnail_url) {
                    embed.setImage(stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360'));
                }
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Watch').setURL(`https://twitch.tv/${streamer}`).setStyle(ButtonStyle.Link)
                );
                return message.reply({ embeds: [embed], components: [row] });
            }
        },
        list: {
            aliases: [],
            data: { name: 'twitch list', description: 'View all Twitch stream notifications', usage: ',twitch list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needPremium(message)) return;
                const rows = query('SELECT * FROM autopost_twitch WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no streamer notification set for this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    const mention = channel ? channel.toString() : `<#${row.channel_id}>`;
                    return `**${row.streamer}** - ${mention}${row.message ? `\n> ${row.message}` : ''}`;
                });
                return paginate(message, lines, 'Twitch Notifications', guildAuthor(message));
            }
        }
    }
};
