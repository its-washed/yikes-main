const { warn, paginate } = require('../../utils/context');
const { query } = require('../../utils/database');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'cashleaderboard', description: 'Cash leaderboard for the economy', usage: ',cashleaderboard' },
    aliases: ['clb'],
    cooldown: 5,
    async execute(message, args, client) {
        const results = query('SELECT user_id, cash, card FROM economy ORDER BY cash DESC LIMIT 1000');
        if (!results.length) return warn(message, 'No one has any cash yet.');
        const members = new Set(message.guild.members.cache.map(m => m.id));
        const sorted = results.filter(row => members.has(String(row.user_id)));

        const lines = [];
        for (const row of sorted) {
            if (!client.users.cache.get(String(row.user_id))) continue;
            const company = E.getUserCompany(row.user_id);
            lines.push(`**<@${row.user_id}>**${company ? ` | ${company.tag}` : ''} (\`${row.user_id}\`)\n> ${E.humanize(Math.round(row.cash * 100) / 100)} 💵 | ${E.humanize(Math.round(row.card * 100) / 100)} 💳`);
        }
        if (!lines.length) return warn(message, 'No one has any cash yet.');
        return paginate(message, lines.slice(0, 500), 'Cash economy leaderboard', { name: message.author.username });
    }
};
