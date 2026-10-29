const { run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needManager, guildName, resolveServer } = require('../../utils/staff');

async function parseUser(message, token) {
    if (!token) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned && String(token).includes(mentioned.id)) return mentioned;
    const cleaned = String(token).replace(/[<@!>]/g, '');
    if (!/^\d{16,22}$/.test(cleaned)) return null;
    return message.client.users.fetch(cleaned).catch(() => null);
}

module.exports = {
    permission: "bot manager",
    data: { name: 'authorized', description: 'Manage authorized users', usage: ',authorized <add|remove|list>' },
    aliases: ['auth'],
    cooldown: 0,
    subcommands: ['add', 'remove', 'list'],
    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, remove, list');
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'authorized add', description: 'Add a user to the authorized list', usage: ',authorized add <user> <server>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const user = await parseUser(message, args[0]);
                const server = await resolveServer(client, args[1]);
                if (!user || !server) return warn(message, 'Usage: `authorized add <user> <server>`');
                run('INSERT INTO authorized (owner_id, guild_id, timestamp) VALUES (?, ?, ?)', user.id, server, Math.floor(Date.now() / 1000));
                return approve(message, `User **${user}** has been successfully added to the authorized list for **${guildName(client, server, true)}**`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'authorized remove', description: 'Remove a user from the authorized list', usage: ',authorized remove <user> <server>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const user = await parseUser(message, args[0]);
                const server = await resolveServer(client, args[1]);
                if (!user || !server) return warn(message, 'Usage: `authorized remove <user> <server>`');
                run('DELETE FROM authorized WHERE owner_id = ? AND guild_id = ?', user.id, server);
                return approve(message, `User **${user}** has been successfully removed from the authorized list for **${guildName(client, server, true)}**`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'authorized list', description: 'List all authorized servers', usage: ',authorized list' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const rows = query('SELECT * FROM authorized');
                if (!rows.length) return warn(message, 'There are no authorized servers');
                const lines = rows.map(row => `**${guildName(client, row.guild_id, true)}** - <@${row.owner_id}>`);
                return paginate(message, lines, 'Authorized servers');
            }
        }
    }
};
