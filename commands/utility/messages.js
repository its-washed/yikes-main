const { warn, paginate } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');
const { query } = require('../../utils/database');

function userCount(userId, guildId, days) {
    const cond = days === 0 ? "date('now')" : `date('now', '-${days} days')`;
    const row = query(`SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages WHERE user_id = ? AND server_id = ? AND message_date >= ${cond}`,
        userId, guildId)[0];
    return Number(row ? row.total : 0) || 0;
}

function totalUserCount(userId, guildId) {
    const row = query('SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages WHERE user_id = ? AND server_id = ?',
        userId, guildId)[0];
    return Number(row ? row.total : 0) || 0;
}

function guildLeaderboard(guildId, days) {
    const cond = days === null ? '' : `AND message_date >= date('now', '-${days} days')`;
    return query(`SELECT user_id, SUM(message_count) AS total_count FROM activity_messages WHERE server_id = ? ${cond} GROUP BY user_id ORDER BY total_count DESC`, guildId);
}

function sendCounts(message, rows, period) {
    if (!rows.length) return warn(message, `No messages found for **${period}**`);
    let total = 0;
    const entries = rows.map((row) => {
        const total2 = Number(row.total_count) || 0;
        total += total2;
        const user = message.client.users.cache.get(row.user_id);
        return `${user ? `${user}` : `<@${row.user_id}>`} - ${total2.toLocaleString('en-US')} messages`;
    });
    return paginate(message, entries, `${period.charAt(0).toUpperCase() + period.slice(1)} Messages (${total.toLocaleString('en-US')})`, {
        name: message.guild.name,
        icon_url: message.guild.iconURL()
    });
}

async function userStats(message, args) {
    const user = message.mentions.users.first() || message.author;
    const today = userCount(user.id, message.guild.id, 0);
    const week = userCount(user.id, message.guild.id, 7);
    const month = userCount(user.id, message.guild.id, 30);
    const total = totalUserCount(user.id, message.guild.id);
    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `${user.username}'s Messages`,
            author: { name: message.guild.name, icon_url: message.guild.iconURL() },
            description: `**Today**: ${today.toLocaleString('en-US')}\n**Last 7 days**: ${week.toLocaleString('en-US')}\n**Last 30 days**: ${month.toLocaleString('en-US')}\n**Total**: ${total.toLocaleString('en-US')}`
        }]
    });
}

module.exports = {
    data: { name: 'messages', description: 'Shows messages statistics', usage: ',messages [user]' },
    aliases: ['m', 'msg'],
    cooldown: 5,
    subcommands: ['user', 'daily', 'weekly', 'monthly', 'total', 'global'],
    subUsages: {
        user: ',messages user its_washed',
        daily: ',messages daily',
        weekly: ',messages weekly',
        monthly: ',messages monthly',
        total: ',messages total',
        global: ',messages global'
    },

    execute: async (message, args) => userStats(message, args),

    subs: {
        user: {
            aliases: [],
            data: { name: 'messages user', description: 'Shows messages sent by a user', usage: ',messages user its_washed' },
            execute: async (message, args) => userStats(message, args)
        },
        daily: {
            aliases: [],
            data: { name: 'messages daily', description: 'Shows messages sent in the past 24 hours', usage: ',messages daily' },
            execute: async (message) => sendCounts(message, guildLeaderboard(message.guild.id, 0), 'daily')
        },
        weekly: {
            aliases: [],
            data: { name: 'messages weekly', description: 'Shows messages sent in the past 7 days', usage: ',messages weekly' },
            execute: async (message) => sendCounts(message, guildLeaderboard(message.guild.id, 7), 'weekly')
        },
        monthly: {
            aliases: [],
            data: { name: 'messages monthly', description: 'Shows messages sent in the past 30 days', usage: ',messages monthly' },
            execute: async (message) => sendCounts(message, guildLeaderboard(message.guild.id, 30), 'monthly')
        },
        total: {
            aliases: [],
            data: { name: 'messages total', description: 'Shows messages sent for the total of the server', usage: ',messages total' },
            execute: async (message) => sendCounts(message, guildLeaderboard(message.guild.id, null), 'total')
        },
        global: {
            aliases: [],
            data: { name: 'messages global', description: 'Shows total messages sent across all servers', usage: ',messages global' },
            execute: async (message) => {
                const scalar = (sql, ...params) => {
                    const row = query(sql, ...params)[0];
                    return Number(Object.values(row || {})[0] || 0);
                };
                const daily = scalar("SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages WHERE message_date >= date('now')");
                const weekly = scalar("SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages WHERE message_date >= date('now', '-7 days')");
                const monthly = scalar("SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages WHERE message_date >= date('now', '-30 days')");
                const total = scalar('SELECT COALESCE(SUM(message_count), 0) AS total FROM activity_messages');
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: 'Total Messages',
                        author: { name: message.author.username, icon_url: message.author.avatarURL() },
                        description: `**Today**: ${daily.toLocaleString('en-US')}\n**Last 7 days**: ${weekly.toLocaleString('en-US')}\n**Last 30 days**: ${monthly.toLocaleString('en-US')}\n**Total**: ${total.toLocaleString('en-US')}`
                    }]
                });
            }
        }
    }
};
