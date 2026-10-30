const { PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/database');
const { warn, paginate } = require('../../utils/context');
const { needPerks } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');

module.exports = {
    permission: "donator",
    data: { name: 'lookup', description: 'Lookup commands', usage: ',lookup <username|vanity>' },
    aliases: ['pomelo', 'handles'],
    cooldown: 5,
    subcommands: ['username', 'vanity'],
    subUsages: {
        username: ',lookup username [length]',
        vanity: ',lookup vanity [length]'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        username: {
            aliases: ['usernames'],
            data: { name: 'lookup username', description: 'Get the most recent username changes', usage: ',lookup username [length]' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const length = args[0] ? parseInt(args[0], 10) : null;
                let results;
                if (length !== null && !Number.isNaN(length)) {
                    results = query('SELECT username, timestamp FROM usernames WHERE LENGTH(username) = ? ORDER BY timestamp DESC', length);
                } else {
                    const threshold = Math.floor(Date.now() / 1000) - 21 * 24 * 60 * 60;
                    results = query('SELECT username, timestamp FROM usernames WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10000', threshold);
                }
                if (!results.length) return warn(message, length !== null && !Number.isNaN(length) ? `No usernames found with ${length} characters` : 'No usernames found');
                const output = results.map(r => `${r.username} - <t:${Math.floor(r.timestamp)}:R>`);
                return paginate(message, output, 'Pomelo Usernames');
            }
        },
        vanity: {
            aliases: ['vanitys'],
            data: { name: 'lookup vanity', description: 'Get the most recent vanity changes', usage: ',lookup vanity [length]' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const length = args[0] ? parseInt(args[0], 10) : null;
                let results;
                if (length !== null && !Number.isNaN(length)) {
                    results = query('SELECT vanity, time FROM vanitys WHERE LENGTH(vanity) = ? ORDER BY time DESC', length);
                } else {
                    results = query('SELECT vanity, time FROM vanitys ORDER BY time DESC');
                }
                if (!results.length) return warn(message, length !== null && !Number.isNaN(length) ? `No vanity URLs found with ${length} characters` : 'No vanity URLs found');
                const output = results.map(r => `${r.vanity} - <t:${Math.floor(r.time)}:R>`);
                return paginate(message, output, 'Pomelo Vanity URLs');
            }
        }
    }
};
