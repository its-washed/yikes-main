const { paginate, warn } = require('../../utils/context');
const { query } = require('../../utils/database');

function parseTimeframe(value) {
    if (!value) return null;
    const match = String(value).toLowerCase().match(/^(\d+)(s|m|h|d|w|y)$/);
    if (!match) return null;
    const units = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };
    return Number(match[1]) * units[match[2]];
}

function humanDate(timestamp) {
    const d = new Date(timestamp * 1000);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

module.exports = {
    data: { name: 'joins', description: 'View members who joined the server within a given timeframe', usage: ',joins [timeframe]' },
    aliases: ['joined'],
    cooldown: 5,

    async execute(message, args) {
        const timeframe = parseTimeframe(args[0]);
        if (args[0] && timeframe === null) {
            return warn(message, 'Invalid timeframe\n> Use formats like `10s`, `5m`, `2h`, `1d`, `2w`');
        }
        let rows;
        let sinceTimestamp = 0;
        if (timeframe) {
            sinceTimestamp = Math.floor(Date.now() / 1000) - timeframe;
            rows = query('SELECT user_id, timestamp FROM activity_joined WHERE guild_id = ? AND timestamp >= ? ORDER BY timestamp DESC',
                message.guild.id, sinceTimestamp);
        } else {
            rows = query('SELECT user_id, timestamp FROM activity_joined WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 100',
                message.guild.id);
        }
        if (!rows.length) return warn(message, 'No members joined in this timeframe');

        const entries = rows.map((row) => {
            const member = message.guild.members.cache.get(row.user_id);
            const joinTime = `<t:${Math.floor(row.timestamp)}:R>`;
            return member ? `${member} - ${joinTime}` : `<@${row.user_id}> (left) - ${joinTime}`;
        });
        const sinceMessage = timeframe ? `since ${humanDate(sinceTimestamp)}` : 'recently';
        return paginate(message, entries, `Members joined ${sinceMessage}`, {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
