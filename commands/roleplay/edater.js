const { query } = require('../../utils/database');
const { paginate, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'edater', description: 'List all married users', usage: ',edater' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const rows = query('SELECT * FROM marry ORDER BY timestamp DESC');
        if (!rows.length) {
            return warn(message, 'There are no married users');
        }

        const lines = [];
        for (const row of rows) {
            const authorId = String(row.author);
            const soulmateId = String(row.soulmate);
            const author = client.users.cache.get(authorId) || await client.users.fetch(authorId).catch(() => null);
            const soulmate = client.users.cache.get(soulmateId) || await client.users.fetch(soulmateId).catch(() => null);
            if (author && soulmate) {
                lines.push(`**${author}** & **${soulmate}** - <t:${Math.floor(Number(row.timestamp))}:R>`);
            }
        }

        if (!lines.length) {
            return warn(message, 'There are no married users');
        }

        return paginate(message, lines, 'Married Users', {
            name: message.guild.name,
            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
        });
    }
};
