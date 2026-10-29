const { paginate, warn } = require('../../utils/context');
const { query } = require('../../utils/database');

module.exports = {
    data: { name: 'boosterslost', description: 'View all recent server boosters that unboosted', usage: ',boosterslost' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const check = query('SELECT * FROM booster_lost WHERE guild_id = ? ORDER BY timestamp', message.guild.id);
        if (!check.length) return warn(message, 'This server has no recent booster losses.');
        const entries = check.map((row) => `<@${row.user_id}> - <t:${Math.floor(row.timestamp)}:R>`).reverse();
        return paginate(message, entries, 'Boosters Lost', {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
