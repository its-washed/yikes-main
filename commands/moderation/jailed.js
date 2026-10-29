const { query } = require('../../utils/database');
const { paginate, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'jailed', description: 'Returns the jailed members', usage: ',jailed' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        const rows = query('SELECT * FROM jail_members WHERE guild_id = ?', message.guild.id);
        const jailed = [];

        for (const row of rows) {
            const member = message.guild.members.cache.get(String(row.user_id));
            if (!member) continue;
            const stamped = row.jailed_at ? Math.floor(new Date(row.jailed_at).getTime() / 1000) : null;
            jailed.push(`${member}${stamped && stamped > 0 ? ` - <t:${stamped}:R>` : ''}`);
        }

        if (!jailed.length) {
            return warn(message, 'There are no jailed members');
        }

        return paginate(message, jailed, 'Jailed members', {
            name: message.guild.name,
            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
        });
    }
};
