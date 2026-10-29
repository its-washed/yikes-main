const { warn, paginate } = require('../../utils/context');
const { query } = require('../../utils/database');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'networthleaderboard', description: 'Networth leaderboard for the economy', usage: ',networthleaderboard' },
    aliases: ['nlb'],
    cooldown: 5,
    async execute(message, args, client) {
        const results = query('SELECT user_id FROM economy');
        if (!results.length) return warn(message, 'No one has any networth yet.');
        const members = new Set(message.guild.members.cache.map(m => m.id));
        const sorted = results
            .filter(row => members.has(String(row.user_id)))
            .map(row => ({ user_id: row.user_id, networth: E.getUserNetworth(row.user_id) }))
            .filter(row => client.users.cache.get(String(row.user_id)))
            .sort((a, b) => b.networth - a.networth);

        if (!sorted.length) return warn(message, 'No one has any networth yet.');
        const lines = sorted.map(row => {
            const company = E.getUserCompany(row.user_id);
            return `**<@${row.user_id}>**${company ? ` | ${company.tag}` : ''} (\`${row.user_id}\`)\n> Networth: ${E.humanize(row.networth)} 💵`;
        });
        return paginate(message, lines.slice(0, 500), 'Networth economy leaderboard', { name: message.author.username });
    }
};
