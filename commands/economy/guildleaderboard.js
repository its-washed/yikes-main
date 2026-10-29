const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn, paginate } = require('../../utils/context');
const { query } = require('../../utils/database');
const E = require('../../utils/econ');

function formatEntry(client, row, tag) {
    const user = client.users.cache.get(String(row.user_id));
    const mention = user ? `**${user.username}**` : `**<@${row.user_id}>**`;
    return `${mention}${tag ? ` | ${tag}` : ''} (\`${row.user_id}\`)\n> ${E.humanize(Math.round(row.cash * 100) / 100)} 💵 | ${E.humanize(Math.round(row.card * 100) / 100)} 💳`;
}

module.exports = {
    data: { name: 'guildleaderboard', description: 'Guild leaderboard for the economy', usage: ',guildleaderboard' },
    aliases: ['glb'],
    cooldown: 5,
    async execute(message, args, client) {
        const memberIds = message.guild.members.cache.map(m => m.id);
        if (!memberIds.length) return warn(message, "No one in this server has any cash yet.");

        const placeholders = memberIds.map(() => '?').join(',');
        const results = query(`SELECT user_id, cash, card FROM economy WHERE user_id IN (${placeholders})`, ...memberIds);
        if (!results.length) return warn(message, 'No one has any cash yet.');

        const sorted = results.slice().sort((a, b) => (b.cash + b.card) - (a.cash + a.card));
        const lines = [];
        for (const row of sorted) {
            if (!client.users.cache.get(String(row.user_id))) continue;
            const company = E.getUserCompany(row.user_id);
            lines.push(formatEntry(client, row, company ? company.tag : ''));
        }
        if (!lines.length) return warn(message, 'No one has any cash yet.');
        return paginate(message, lines.slice(0, 500), 'Guild economy leaderboard', { name: message.author.username });
    }
};
