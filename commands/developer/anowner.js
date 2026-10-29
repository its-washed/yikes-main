const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needModerator } = require('../../utils/staff');

module.exports = {
    permission: "bot moderator",
    data: { name: 'anowner', description: 'Change the antinuke owner of a guild', usage: ',anowner <server> <user>' },
    aliases: [],
    cooldown: 0,

    execute: async (message, args, client) => {
        if (!await needModerator(message)) return;
        const guildId = String(args[0] || '').replace(/[^\d]/g, '');
        const userId = String(args[1] || '').replace(/[<@!>]/g, '');
        if (!guildId || !userId) return warn(message, 'Usage: `anowner <server> <user>`');
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return warn(message, 'Usage: `anowner <server> <user>`');
        const member = await client.users.fetch(userId).catch(() => null);
        if (!member) return warn(message, 'Usage: `anowner <server> <user>`');
        if (first('SELECT * FROM antinuke WHERE guild_id = ?', guildId)) {
            run('UPDATE antinuke SET owner_id = ? WHERE guild_id = ?', member.id, guildId);
        } else {
            run('INSERT INTO antinuke (guild_id, configured, owner_id) VALUES (?, ?, ?)', guildId, 'false', member.id);
        }
        return approve(message, `${member} is the **new** antinuke owner for **${guild.name}**`);
    }
};
