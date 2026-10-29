const { first, query } = require('../../utils/database');
const { warn, paginate } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');

function isBotOwner(client, userId) {
    const ownerId = client.application && client.application.owner ? (client.application.owner.id || null) : null;
    return ownerId && ownerId === userId;
}

module.exports = {
    permission: "donator",
    data: { name: 'deeplookup', description: 'Deep lookup a member', usage: ',deeplookup [user]' },
    aliases: ['dlu', 'deep'],
    cooldown: 10,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;
        const mentioned = message.mentions.users.first();
        const token = args[0] ? String(args[0]).replace(/[<@!>]/g, '') : null;
        const user = mentioned || (token && /^\d{17,20}$/.test(token) ? await client.users.fetch(token).catch(() => null) : null) || message.author;

        if (isBotOwner(client, user.id) && !isBotOwner(client, message.author.id)) {
            return warn(message, "You can't deep lookup the owner of the bot");
        }
        const messageData = query(
            'SELECT server_id, SUM(message_count) AS total_messages FROM activity_messages WHERE user_id = ? GROUP BY server_id ORDER BY total_messages DESC',
            user.id
        );
        if (!messageData.length) return warn(message, `No data found for ${user.toString()}`);

        const content = [];
        for (const entry of messageData) {
            const guild = client.guilds.cache.get(String(entry.server_id));
            if (guild) {
                content.push(`**${guild.name}** - \`${Math.floor(entry.total_messages).toLocaleString('en-US')}\` messages`);
            } else {
                const guildRow = first('SELECT guild_name FROM guild_names WHERE guild_id = ?', entry.server_id);
                if (guildRow) content.push(`**${guildRow.guild_name}** - \`${Math.floor(entry.total_messages).toLocaleString('en-US')}\` messages`);
                else content.push(`**${entry.server_id}** - \`${Math.floor(entry.total_messages).toLocaleString('en-US')}\` messages`);
            }
        }
        if (!content.length) return warn(message, `${user.toString()} has no message records across any servers`);
        return paginate(message, content, `Deep lookup for ${user.username}`,
            { name: user.username, icon_url: user.displayAvatarURL() });
    }
};
