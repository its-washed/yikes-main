const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { humanizeTime } = require('../../utils/helpers');

const RANGES = { '1d': 1, '7d': 7, '14d': 14, '30d': 30, lifetime: null };
const LB_RANGES = { '1d': 1, '7d': 7, '30d': 30, lifetime: null };

function resolveRange(value, valid = RANGES) {
    const range = String(value || 'lifetime').toLowerCase();
    if (!(range in valid)) return { range: null, error: true };
    return { range, days: valid[range] };
}

function dateCond(days, column) {
    if (days === null || days === undefined) return '';
    return `AND ${column} >= date('now', '-${days} days')`;
}

function tsCond(days) {
    if (days === null || days === undefined) return '';
    return `AND timestamp >= CAST(strftime('%s', 'now', '-${days} days', 'start of day') AS INTEGER)`;
}

function scalar(sql, ...params) {
    const row = query(sql, ...params)[0];
    return Number(Object.values(row || {})[0] || 0) || 0;
}

function rankOf(guildId, table, valueCol, cond, userId) {
    const rows = query(`SELECT user_id, SUM(${valueCol}) AS value FROM ${table} WHERE server_id = ? ${cond} GROUP BY user_id ORDER BY value DESC`, guildId);
    const index = rows.findIndex((row) => String(row.user_id) === String(userId));
    return index === -1 ? 0 : index + 1;
}

function topRows(sql, ...params) {
    return query(sql, ...params);
}

function resolveChannel(message, args) {
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const raw = String(args.join(' ') || '').trim();
    if (!raw) return message.channel;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find((c) => c.name === raw) || null;
}

async function userStats(message, args) {
    const member = message.mentions.members.first() || message.member;
    const rangeArg = args.filter((a) => !a.includes(member.id))[0];
    const { range, days, error } = resolveRange(rangeArg);
    if (error) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `14d`, `30d` or `lifetime`');

    const mCond = dateCond(days, 'message_date');
    const vCond = dateCond(days, 'voice_date');

    const msgRank = rankOf(message.guild.id, 'activity_messages', 'message_count', mCond, member.id);
    const voiceRank = rankOf(message.guild.id, 'activity_voice', 'voice_time', vCond, member.id);

    const dayMsg = scalar('SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE user_id = ? AND server_id = ? AND message_date >= date(\'now\')', member.id, message.guild.id);
    const weekMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE user_id = ? AND server_id = ? AND message_date >= date('now', '-7 days')", member.id, message.guild.id);
    const monthMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE user_id = ? AND server_id = ? AND message_date >= date('now', '-30 days')", member.id, message.guild.id);
    const totalMsg = scalar('SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE user_id = ? AND server_id = ?', member.id, message.guild.id);

    const dayVoice = scalar('SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE user_id = ? AND server_id = ? AND voice_date >= date(\'now\')', member.id, message.guild.id);
    const weekVoice = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE user_id = ? AND server_id = ? AND voice_date >= date('now', '-7 days')", member.id, message.guild.id);
    const monthVoice = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE user_id = ? AND server_id = ? AND voice_date >= date('now', '-30 days')", member.id, message.guild.id);
    const totalVoice = scalar('SELECT COALESCE(SUM(total_time), 0) AS v FROM voicetrack WHERE user_id = ? AND guild_id = ?', member.id, message.guild.id);

    const topText = topRows(`SELECT channel_id, SUM(message_count) AS value FROM activity_messages WHERE user_id = ? AND server_id = ? ${mCond} AND channel_id != 0 GROUP BY channel_id ORDER BY value DESC LIMIT 3`, member.id, message.guild.id);
    const topVoiceCh = topRows(`SELECT channel_id, SUM(voice_time) AS value FROM activity_voice WHERE user_id = ? AND server_id = ? ${vCond} AND channel_id != 0 GROUP BY channel_id ORDER BY value DESC LIMIT 3`, member.id, message.guild.id);

    const channelLine = (rows, formatter) => rows.length
        ? rows.map((row) => {
            const channel = message.guild.channels.cache.get(row.channel_id);
            return `> ${channel ? `<#${row.channel_id}>` : 'Unknown'}: ${formatter(Number(row.value) || 0)}`;
        }).join('\n')
        : '> None';

    const totalVoiceHuman = humanizeTime(Math.floor(totalVoice), true, 'HH-MM-SS');

    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `${member.user.username}'s Activity [${range.charAt(0).toUpperCase() + range.slice(1)}]`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            thumbnail: { url: member.user.displayAvatarURL() },
            fields: [
                { name: 'Rank', value: `> **Messages:** #${msgRank.toLocaleString('en-US')}\n> **Voice:** #${voiceRank.toLocaleString('en-US')}`, inline: true },
                { name: 'Messages', value: `> **Today:** ${dayMsg.toLocaleString('en-US')}\n> **7 days:** ${weekMsg.toLocaleString('en-US')}\n> **30 days:** ${monthMsg.toLocaleString('en-US')}\n> **Total:** ${totalMsg.toLocaleString('en-US')}`, inline: true },
                { name: 'Voice', value: `> **Today:** ${humanizeTime(Math.floor(dayVoice), true, 'HH-MM-SS')}\n> **7 days:** ${humanizeTime(Math.floor(weekVoice), true, 'HH-MM-SS')}\n> **30 days:** ${humanizeTime(Math.floor(monthVoice), true, 'HH-MM-SS')}\n> **Total:** ${totalVoiceHuman}`, inline: true },
                { name: 'Top Text Channels', value: channelLine(topText, (v) => `${v.toLocaleString('en-US')} messages`), inline: true },
                { name: 'Top Voice Channels', value: channelLine(topVoiceCh, (v) => humanizeTime(Math.floor(v), true, 'HH-MM-SS')), inline: true }
            ]
        }]
    });
}

async function channelStats(message, args) {
    const { range, days, error } = resolveRange(args.filter((a) => !a.startsWith('<#')).pop());
    if (error) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `14d`, `30d` or `lifetime`');
    const channel = resolveChannel(message, args.filter((a) => !/^\d+[dh]$/.test(a)));
    if (!channel) return warn(message, 'Channel not found');
    const cond = dateCond(days, 'message_date');

    const dayMsg = scalar('SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date(\'now\')', channel.id, message.guild.id);
    const weekMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date('now', '-7 days')", channel.id, message.guild.id);
    const monthMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date('now', '-30 days')", channel.id, message.guild.id);
    const totalMsg = scalar(`SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? ${cond}`, channel.id, message.guild.id);

    const contributorsDay = scalar("SELECT COUNT(DISTINCT user_id) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date('now')", channel.id, message.guild.id);
    const contributorsWeek = scalar("SELECT COUNT(DISTINCT user_id) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date('now', '-7 days')", channel.id, message.guild.id);
    const contributorsMonth = scalar("SELECT COUNT(DISTINCT user_id) AS v FROM activity_messages WHERE channel_id = ? AND server_id = ? AND message_date >= date('now', '-30 days')", channel.id, message.guild.id);

    const topMembers = topRows(`SELECT user_id, SUM(message_count) AS value FROM activity_messages WHERE channel_id = ? AND server_id = ? ${cond} GROUP BY user_id ORDER BY value DESC LIMIT 3`, channel.id, message.guild.id);
    const topDates = topRows(`SELECT message_date AS date, SUM(message_count) AS value FROM activity_messages WHERE channel_id = ? AND server_id = ? ${cond} GROUP BY message_date ORDER BY value DESC LIMIT 3`, channel.id, message.guild.id);

    const lines = [
        `**Messages:** ${totalMsg.toLocaleString('en-US')} total`,
        `> Today: ${dayMsg.toLocaleString('en-US')} | 7 days: ${weekMsg.toLocaleString('en-US')} | 30 days: ${monthMsg.toLocaleString('en-US')}`,
        `**Contributors:**`,
        `> Today: ${contributorsDay.toLocaleString('en-US')} | 7 days: ${contributorsWeek.toLocaleString('en-US')} | 30 days: ${contributorsMonth.toLocaleString('en-US')}`,
        `**Top Members:**`,
        ...(topMembers.length ? topMembers.map((row) => {
            const member = message.guild.members.cache.get(row.user_id);
            return `> ${member ? `${member.user.username}` : 'Unknown'}: ${(Number(row.value) || 0).toLocaleString('en-US')} messages`;
        }) : ['> None']),
        `**Top Dates:**`,
        ...(topDates.length ? topDates.map((row) => `> ${row.date}: ${(Number(row.value) || 0).toLocaleString('en-US')} messages`) : ['> None'])
    ];

    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `#${channel.name} Activity [${range.charAt(0).toUpperCase() + range.slice(1)}]`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            description: lines.join('\n')
        }]
    });
}

function guildMessageStats(message, range, days) {
    const cond = dateCond(days, 'message_date');
    const day = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now')", message.guild.id);
    const week = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now', '-7 days')", message.guild.id);
    const month = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now', '-30 days')", message.guild.id);
    const total = scalar(`SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? ${cond}`, message.guild.id);
    const topMembers = topRows(`SELECT user_id, SUM(message_count) AS value FROM activity_messages WHERE server_id = ? ${cond} GROUP BY user_id ORDER BY value DESC LIMIT 3`, message.guild.id);
    const topChannels = topRows(`SELECT channel_id, SUM(message_count) AS value FROM activity_messages WHERE server_id = ? ${cond} AND channel_id != 0 GROUP BY channel_id ORDER BY value DESC LIMIT 3`, message.guild.id);
    const dayVoice = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now')", message.guild.id);
    const weekVoice = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now', '-7 days')", message.guild.id);
    const monthVoice = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now', '-30 days')", message.guild.id);

    const lines = [
        `**Messages:** ${total.toLocaleString('en-US')} total`,
        `> Today: ${day.toLocaleString('en-US')} | 7 days: ${week.toLocaleString('en-US')} | 30 days: ${month.toLocaleString('en-US')}`,
        `**Voice:**`,
        `> Today: ${humanizeTime(Math.floor(dayVoice), true, 'HH-MM-SS')} | 7 days: ${humanizeTime(Math.floor(weekVoice), true, 'HH-MM-SS')} | 30 days: ${humanizeTime(Math.floor(monthVoice), true, 'HH-MM-SS')}`,
        `**Top Members:**`,
        ...(topMembers.length ? topMembers.map((row) => {
            const member = message.guild.members.cache.get(row.user_id);
            return `> ${member ? `${member.user.username}` : 'Unknown'}: ${(Number(row.value) || 0).toLocaleString('en-US')} messages`;
        }) : ['> None']),
        `**Top Channels:**`,
        ...(topChannels.length ? topChannels.map((row) => {
            const channel = message.guild.channels.cache.get(row.channel_id);
            return `> ${channel ? `<#${row.channel_id}>` : 'Unknown'}: ${(Number(row.value) || 0).toLocaleString('en-US')} messages`;
        }) : ['> None'])
    ];

    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `Message Activity [${range.charAt(0).toUpperCase() + range.slice(1)}]`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            description: lines.join('\n')
        }]
    });
}

function guildVoiceStats(message, range, days) {
    const cond = dateCond(days, 'voice_date');
    const day = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now')", message.guild.id);
    const week = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now', '-7 days')", message.guild.id);
    const month = scalar("SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? AND voice_date >= date('now', '-30 days')", message.guild.id);
    const total = scalar(`SELECT COALESCE(SUM(voice_time), 0) AS v FROM activity_voice WHERE server_id = ? ${cond}`, message.guild.id);
    const topMembers = topRows(`SELECT user_id, SUM(voice_time) AS value FROM activity_voice WHERE server_id = ? ${cond} GROUP BY user_id ORDER BY value DESC LIMIT 3`, message.guild.id);
    const topChannels = topRows(`SELECT channel_id, SUM(voice_time) AS value FROM activity_voice WHERE server_id = ? ${cond} AND channel_id != 0 GROUP BY channel_id ORDER BY value DESC LIMIT 3`, message.guild.id);
    const dayMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now')", message.guild.id);
    const weekMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now', '-7 days')", message.guild.id);
    const monthMsg = scalar("SELECT COALESCE(SUM(message_count), 0) AS v FROM activity_messages WHERE server_id = ? AND message_date >= date('now', '-30 days')", message.guild.id);

    const lines = [
        `**Voice:** ${humanizeTime(Math.floor(total), true, 'HH-MM-SS')} total`,
        `> Today: ${humanizeTime(Math.floor(day), true, 'HH-MM-SS')} | 7 days: ${humanizeTime(Math.floor(week), true, 'HH-MM-SS')} | 30 days: ${humanizeTime(Math.floor(month), true, 'HH-MM-SS')}`,
        `**Messages:**`,
        `> Today: ${dayMsg.toLocaleString('en-US')} | 7 days: ${weekMsg.toLocaleString('en-US')} | 30 days: ${monthMsg.toLocaleString('en-US')}`,
        `**Top Members:**`,
        ...(topMembers.length ? topMembers.map((row) => {
            const member = message.guild.members.cache.get(row.user_id);
            return `> ${member ? `${member.user.username}` : 'Unknown'}: ${humanizeTime(Math.floor(Number(row.value) || 0), true, 'HH-MM-SS')}`;
        }) : ['> None']),
        `**Top Channels:**`,
        ...(topChannels.length ? topChannels.map((row) => {
            const channel = message.guild.channels.cache.get(row.channel_id);
            return `> ${channel ? `<#${row.channel_id}>` : 'Unknown'}: ${humanizeTime(Math.floor(Number(row.value) || 0), true, 'HH-MM-SS')}`;
        }) : ['> None'])
    ];

    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `Voice Activity [${range.charAt(0).toUpperCase() + range.slice(1)}]`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            description: lines.join('\n')
        }]
    });
}

function guildServerStats(message, range, days) {
    const cond = tsCond(days);
    const joinedDay = scalar("SELECT COUNT(*) AS v FROM activity_joined WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', 'start of day') AS INTEGER)", message.guild.id);
    const joinedWeek = scalar("SELECT COUNT(*) AS v FROM activity_joined WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', '-7 days', 'start of day') AS INTEGER)", message.guild.id);
    const joinedMonth = scalar("SELECT COUNT(*) AS v FROM activity_joined WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', '-30 days', 'start of day') AS INTEGER)", message.guild.id);
    const leftDay = scalar("SELECT COUNT(*) AS v FROM activity_left WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', 'start of day') AS INTEGER)", message.guild.id);
    const leftWeek = scalar("SELECT COUNT(*) AS v FROM activity_left WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', '-7 days', 'start of day') AS INTEGER)", message.guild.id);
    const leftMonth = scalar("SELECT COUNT(*) AS v FROM activity_left WHERE guild_id = ? AND timestamp >= CAST(strftime('%s', 'now', '-30 days', 'start of day') AS INTEGER)", message.guild.id);

    const topJoinDates = topRows(`SELECT date(timestamp, 'unixepoch') AS date, COUNT(user_id) AS value FROM activity_joined WHERE guild_id = ? ${cond} GROUP BY date ORDER BY value DESC LIMIT 3`, message.guild.id);
    const topLeaveDates = topRows(`SELECT date(timestamp, 'unixepoch') AS date, COUNT(user_id) AS value FROM activity_left WHERE guild_id = ? ${cond} GROUP BY date ORDER BY value DESC LIMIT 3`, message.guild.id);

    const lines = [
        `**Members:** ${message.guild.memberCount.toLocaleString('en-US')} total`,
        `**Joined:**`,
        `> Today: ${joinedDay.toLocaleString('en-US')} | 7 days: ${joinedWeek.toLocaleString('en-US')} | 30 days: ${joinedMonth.toLocaleString('en-US')}`,
        `**Left:**`,
        `> Today: ${leftDay.toLocaleString('en-US')} | 7 days: ${leftWeek.toLocaleString('en-US')} | 30 days: ${leftMonth.toLocaleString('en-US')}`,
        `**Top Join Dates:**`,
        ...(topJoinDates.length ? topJoinDates.map((row) => `> ${row.date}: ${(Number(row.value) || 0).toLocaleString('en-US')} members`) : ['> None']),
        `**Top Leave Dates:**`,
        ...(topLeaveDates.length ? topLeaveDates.map((row) => `> ${row.date}: ${(Number(row.value) || 0).toLocaleString('en-US')} members`) : ['> None'])
    ];

    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `Server Activity [${range.charAt(0).toUpperCase() + range.slice(1)}]`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            description: lines.join('\n')
        }]
    });
}

async function buildLeaderboard(message, table, range, days) {
    const valueCol = table === 'voice' ? 'voice_time' : 'message_count';
    const tableName = table === 'voice' ? 'activity_voice' : 'activity_messages';
    const cond = dateCond(days, table === 'voice' ? 'voice_date' : 'message_date');
    const rows = query(`SELECT user_id, SUM(${valueCol}) AS value FROM ${tableName} WHERE server_id = ? ${cond} GROUP BY user_id ORDER BY value DESC LIMIT 10`, message.guild.id);
    if (!rows.length) return null;
    const formattedRange = range === 'lifetime' ? 'Lifetime' : range.charAt(0).toUpperCase() + range.slice(1);
    return {
        color: COLORS.NEUTRAL,
        title: `${table.charAt(0).toUpperCase() + table.slice(1)} Leaderboard [${formattedRange}]`,
        description: rows.map((row, index) =>
            `${index + 1}. <@${row.user_id}>: **${table === 'voice'
                ? humanizeTime(Math.floor(Number(row.value) || 0), true, 'HH-MM-SS')
                : `${(Number(row.value) || 0).toLocaleString('en-US')} messages`}**`
        ).join('\n'),
        thumbnail: message.guild.iconURL() ? { url: message.guild.iconURL() } : undefined,
        footer: { text: 'Last updated' },
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    data: { name: 'activity', description: 'Shows activity statistics', usage: ',activity [user] [range]' },
    aliases: ['act'],
    cooldown: 5,
    subcommands: ['user', 'channel', 'messages', 'voice', 'server', 'ignore', 'leaderboard'],
    subUsages: {
        user: ',activity user its_washed 30d',
        channel: ',activity channel #general 30d',
        messages: ',activity messages 30d',
        voice: ',activity voice 30d',
        server: ',activity server 30d',
        ignore: ',activity ignore <add|remove|list>',
        leaderboard: ',activity leaderboard <add|remove|list>'
    },

    execute: async (message, args) => userStats(message, args),

    subs: {
        user: {
            aliases: [],
            data: { name: 'activity user', description: 'Shows activity statistics for a user with an optional time range', usage: ',activity user its_washed 30d' },
            execute: async (message, args) => userStats(message, args)
        },
        channel: {
            aliases: [],
            data: { name: 'activity channel', description: 'Shows activity statistics for a channel with an optional time range', usage: ',activity channel #general 30d' },
            execute: async (message, args) => channelStats(message, args)
        },
        messages: {
            aliases: [],
            data: { name: 'activity messages', description: 'Shows activity statistics for messages with an optional time range', usage: ',activity messages 30d' },
            execute: async (message, args) => {
                const { range, days, error } = resolveRange(args[0]);
                if (error) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `14d`, `30d` or `lifetime`');
                return guildMessageStats(message, range, days);
            }
        },
        voice: {
            aliases: [],
            data: { name: 'activity voice', description: 'Shows activity statistics for voice with an optional time range', usage: ',activity voice 30d' },
            execute: async (message, args) => {
                const { range, days, error } = resolveRange(args[0]);
                if (error) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `14d`, `30d` or `lifetime`');
                return guildVoiceStats(message, range, days);
            }
        },
        server: {
            aliases: [],
            data: { name: 'activity server', description: 'Shows activity statistics for the server with an optional time range', usage: ',activity server 30d' },
            execute: async (message, args) => {
                const { range, days, error } = resolveRange(args[0]);
                if (error) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `14d`, `30d` or `lifetime`');
                return guildServerStats(message, range, days);
            }
        },
        ignore: {
            aliases: ['ig'],
            data: { name: 'activity ignore', description: 'Manage ignored channels for activity tracking', usage: ',activity ignore <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: ',activity ignore add #general',
                remove: ',activity ignore remove #general',
                list: ',activity ignore list'
            },
            execute: async (message) => sendCard(message, module.exports.subs.ignore),
            subs: {
                add: {
                    aliases: ['a'],
                    data: { name: 'activity ignore add', description: 'Add a channel to the ignored list for activity tracking', usage: ',activity ignore add #general' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const channel = message.mentions.channels.first() || resolveChannel(message, args);
                        if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,activity ignore add #general`');
                        if (first('SELECT 1 AS ok FROM activity_ignore WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                            return warn(message, `Channel ${channel} is already ignored for activity tracking`);
                        }
                        run('INSERT INTO activity_ignore (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                        return approve(message, `Channel ${channel} has been added to the ignored list for activity tracking`);
                    }
                },
                remove: {
                    aliases: ['r'],
                    data: { name: 'activity ignore remove', description: 'Remove a channel from the ignored list for activity tracking', usage: ',activity ignore remove #general' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const channel = message.mentions.channels.first() || resolveChannel(message, args);
                        if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,activity ignore remove #general`');
                        if (!first('SELECT 1 AS ok FROM activity_ignore WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                            return warn(message, `Channel ${channel} is not ignored for activity tracking`);
                        }
                        run('DELETE FROM activity_ignore WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        return approve(message, `Channel ${channel} has been removed from the ignored list for activity tracking`);
                    }
                },
                list: {
                    aliases: ['l'],
                    data: { name: 'activity ignore list', description: 'List all ignored channels for activity tracking', usage: ',activity ignore list' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const rows = query('SELECT * FROM activity_ignore WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return message.reply({ content: 'No channels are ignored for activity tracking' });
                        const entries = rows.map((row) => `<#${row.channel_id}>`);
                        return paginate(message, entries, 'Ignored for Activity Tracking', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL()
                        });
                    }
                }
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'activity leaderboard', description: 'Shows the activity leaderboard for the server', usage: ',activity leaderboard <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: ',activity leaderboard add #act-msg message 30d',
                remove: ',activity leaderboard remove message 30d',
                list: ',activity leaderboard list'
            },
            execute: async (message) => sendCard(message, module.exports.subs.leaderboard),
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'activity leaderboard add', description: 'Add activity leaderboard for a channel', usage: ',activity leaderboard add #act-msg message 30d' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const nonMention = args.filter((a) => !a.startsWith('<#'));
                        const table = String(nonMention[0] || '').toLowerCase();
                        const rangeArg = String(nonMention[1] || 'lifetime').toLowerCase();
                        if (!['message', 'voice'].includes(table)) return warn(message, 'Invalid table! Use `message` or `voice`.');
                        if (!(rangeArg in LB_RANGES)) return warn(message, 'Invalid time range! Use `1d`, `7d`, `30d`, or `lifetime`.');
                        const channel = resolveChannel(message, args);
                        if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,activity leaderboard add #act-msg message 30d`');
                        const days = LB_RANGES[rangeArg];
                        const existing = first('SELECT 1 AS ok FROM activity_leaderboard WHERE guild_id = ? AND type = ? AND "range" = ?',
                            message.guild.id, table, rangeArg);
                        if (existing) return warn(message, `Leaderboard for **${table}** is already set up.`);
                        const embed = await buildLeaderboard(message, table, rangeArg, days);
                        if (!embed) {
                            if (table === 'voice') {
                                return warn(message, 'No voice data found for the specified range.\n> Make sure you enabled voice tracking and someone has been in a voice channel.');
                            }
                            return warn(message, 'No message data found for the specified range.\n> Make sure you have messages in the server.');
                        }
                        const leaderboardMessage = await channel.send({ embeds: [embed] }).catch(() => null);
                        if (!leaderboardMessage) return warn(message, `I can't send messages in ${channel}`);
                        run('INSERT INTO activity_leaderboard (guild_id, type, "range", message_id, channel_id) VALUES (?, ?, ?, ?, ?)',
                            message.guild.id, table, rangeArg, leaderboardMessage.id, channel.id);
                        return approve(message, `Leaderboard for ${table} set up in ${channel}.`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'activity leaderboard remove', description: 'Remove the activity leaderboard for a channel', usage: ',activity leaderboard remove message 30d' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const table = String(args[0] || '').toLowerCase();
                        const rangeArg = String(args[1] || 'lifetime').toLowerCase();
                        if (!['message', 'voice'].includes(table)) return warn(message, 'Invalid table! Please use one of the following: `message` or `voice`');
                        if (!(rangeArg in LB_RANGES)) return warn(message, 'Invalid time range! Please use one of the following: `1d`, `7d`, `30d` or `lifetime`');
                        const check = first('SELECT 1 AS ok FROM activity_leaderboard WHERE guild_id = ? AND type = ? AND "range" = ?',
                            message.guild.id, table, rangeArg);
                        if (!check) return warn(message, `Leaderboard for ${table} is not setup`);
                        run('DELETE FROM activity_leaderboard WHERE guild_id = ? AND type = ? AND "range" = ?',
                            message.guild.id, table, rangeArg);
                        return approve(message, `Leaderboard for ${table} has been removed`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'activity leaderboard list', description: 'List all activity leaderboards for the server', usage: ',activity leaderboard list' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const rows = query('SELECT * FROM activity_leaderboard WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'No leaderboards are setup for this server');
                        const entries = rows.map((row) =>
                            `${String(row.type).charAt(0).toUpperCase() + String(row.type).slice(1)} - ${row['range']} [\`View\`](https://discord.com/channels/${message.guild.id}/${row.channel_id}/${row.message_id})`);
                        return paginate(message, entries, 'Leaderboards', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL()
                        });
                    }
                }
            }
        }
    }
};
