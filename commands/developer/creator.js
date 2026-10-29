const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needManager } = require('../../utils/staff');

function parseUser(message, token) {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const cleaned = String(token || '').replace(/[<@!>]/g, '');
    return message.client.users.cache.get(cleaned) || null;
}

module.exports = {
    permission: "bot manager",
    data: { name: 'creator', description: "Manage users permissions to post embeds on evelina's page", usage: ',creator <add|remove|list>' },
    aliases: [],
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
            data: { name: 'creator add', description: 'Add a user premissions to post embeds', usage: ',creator add <user>' },
            execute: async (message, args) => {
                if (!await needManager(message)) return;
                const user = parseUser(message, args[0]);
                if (!user) return warn(message, 'Usage: `creator add <user>`');
                if (first('SELECT * FROM embeds_creator WHERE user_id = ?', user.id)) {
                    return warn(message, `User ${user} is already permited to post embeds`);
                }
                run('INSERT OR REPLACE INTO embeds_creator (user_id) VALUES (?)', user.id);
                return approve(message, `Permitted ${user} to post embeds`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'creator remove', description: 'Remove a user premissions to post embeds', usage: ',creator remove <user>' },
            execute: async (message, args) => {
                if (!await needManager(message)) return;
                const user = parseUser(message, args[0]);
                if (!user) return warn(message, 'Usage: `creator remove <user>`');
                if (!first('SELECT * FROM embeds_creator WHERE user_id = ?', user.id)) {
                    return warn(message, `User ${user} isn't permited to post embeds`);
                }
                run('DELETE FROM embeds_creator WHERE user_id = ?', user.id);
                return approve(message, `Prohibited ${user} to post embeds`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'creator list', description: 'List all premitted users that can post embeds', usage: ',creator list' },
            execute: async (message) => {
                if (!await needManager(message)) return;
                const rows = query('SELECT * FROM embeds_creator');
                if (!rows.length) return warn(message, 'There are no embed creators');
                return paginate(message, rows.map(row => `<@${row.user_id}>`), 'Embed creators');
            }
        }
    }
};
