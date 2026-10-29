const { warn, paginate } = require('../../utils/context');
const { query } = require('../../utils/database');

module.exports = {
    data: { name: 'ownerhistory', description: 'View the owner history of a guild', usage: ',ownerhistory' },
    aliases: ['oh'],
    cooldown: 3,

    async execute(message) {
        const results = query('SELECT * FROM owner_history WHERE guild_id = ? ORDER BY timestamp DESC', message.guild.id);
        if (!results.length) return warn(message, 'There is no owner history saved for this server');
        const entries = results.map((row) =>
            `<@${row.old_owner}> > <@${row.new_owner}> - <t:${Math.floor(row.timestamp)}:R>`);
        return paginate(message, entries, 'Owner history', {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
