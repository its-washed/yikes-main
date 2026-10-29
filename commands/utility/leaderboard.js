const { warn, paginate } = require('../../utils/context');
const { first, query } = require('../../utils/database');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: {
        name: 'leaderboard',
        description: "Global leaderboard for the economy",
        usage: ',leaderboard'
    },
    aliases: ["lb"],
    cooldown: 10,

    async execute(message, args, client) {
        const results = query('SELECT user_id, cash, card FROM economy ORDER BY cash + card DESC LIMIT 100');
        if (!results.length) return warn(message, "No one has any cash yet.");

        const to_show = [];
        for (const row of results) {
            if (isDeveloper(row.user_id)) continue;
            const user = await message.client.users.fetch(String(row.user_id)).catch(() => null);
            const label = user ? `${user}` : `<@${row.user_id}>`;
            const company = first('SELECT * FROM company WHERE members LIKE ?', `%${row.user_id}%`);
            const companyTag = company && company.tag ? ` | ${company.tag}` : '';
            to_show.push(
                `**${label}${companyTag}** (\`${row.user_id}\`)\n` +
                `> ${Number(row.cash).toLocaleString('en-US')} 💵 | ${Number(row.card).toLocaleString('en-US')} 💳`
            );
        }

        if (!to_show.length) return warn(message, "No one has any cash yet.");
        return paginate(message, to_show.slice(0, 100), "Global economy leaderboard", {
            name: message.author.username,
            icon_url: message.author.displayAvatarURL()
        });
    }
};
