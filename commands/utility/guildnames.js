const { warn, paginate } = require('../../utils/context');
const { query } = require('../../utils/database');

module.exports = {
    data: { name: 'guildnames', description: 'View guildname history', usage: ',guildnames 1228371886690537624', params: ['guild'] },
    aliases: ['gnames'],
    cooldown: 3,

    async execute(message, args) {
        let guild = message.guild.id;
        const raw = String(args[0] || '').replace(/[<@>]/g, '');
        if (raw) {
            if (!/^\d{17,20}$/.test(raw)) return warn(message, 'Invalid guild id');
            guild = raw;
        }
        const results = query('SELECT * FROM guildnames WHERE guild_id = ? ORDER BY timestamp DESC', guild);
        if (!results.length) {
            return warn(message, `There are no guildnames saved for ${guild === message.guild.id ? 'this server' : guild}`);
        }
        const entries = results.map((row) =>
            `**${row.old_name}** - <t:${Math.floor(row.timestamp)}:R>`);
        return paginate(message, entries, 'Guild name changes', {
            name: message.guild.name,
            icon_url: message.guild.iconURL()
        });
    }
};
