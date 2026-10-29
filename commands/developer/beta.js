const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needManager, addTeamRole } = require('../../utils/staff');

const BETA_ROLE = '1338968077957730356';

function resolveCommand(message, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (message.client.commands.has(name)) return name;
    return message.client.aliases.get(name) || null;
}

function parseUser(message, token) {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const cleaned = String(token || '').replace(/[<@!>]/g, '');
    return message.client.users.cache.get(cleaned) || null;
}

module.exports = {
    permission: "bot manager",
    data: { name: 'beta', description: 'Beta commands', usage: ',beta <add|remove|list|command>' },
    aliases: [],
    cooldown: 0,
    subcommands: ['add', 'remove', 'list', 'command'],
    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, remove, list, command');
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'beta add', description: 'Add a user to the beta program', usage: ',beta add <user>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const user = parseUser(message, args[0]);
                if (!user) return warn(message, 'Usage: `beta add <user>`');
                if (first('SELECT * FROM beta_testers WHERE user_id = ?', user.id)) {
                    return warn(message, `User ${user} is already in the beta program`);
                }
                await addTeamRole(client, user.id, BETA_ROLE);
                run('INSERT OR REPLACE INTO beta_testers (user_id) VALUES (?)', user.id);
                return approve(message, `Added ${user} to the beta program`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'beta remove', description: 'Remove a user from the beta program', usage: ',beta remove <user>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const user = parseUser(message, args[0]);
                if (!user) return warn(message, 'Usage: `beta remove <user>`');
                if (!first('SELECT * FROM beta_testers WHERE user_id = ?', user.id)) {
                    return warn(message, `User ${user} isn't in the beta program`);
                }
                run('DELETE FROM beta_testers WHERE user_id = ?', user.id);
                return approve(message, `Removed ${user} from the beta program`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'beta list', description: 'List all users in the beta program', usage: ',beta list' },
            execute: async (message) => {
                if (!await needManager(message)) return;
                const rows = query('SELECT * FROM beta_testers');
                if (!rows.length) return warn(message, 'There are no beta users');
                return paginate(message, rows.map(row => `<@${row.user_id}>`), 'Beta users');
            }
        },
        command: {
            aliases: [],
            data: { name: 'beta command', description: 'Beta command commands', usage: ',beta command <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            execute: async (message) => {
                if (!await needManager(message)) return;
                return sendCard(message, module.exports.subs.command);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'beta command add', description: 'Add a command to the beta program', usage: ',beta command add <command>' },
                    execute: async (message, args) => {
                        if (!await needManager(message)) return;
                        const command = resolveCommand(message, args[0]);
                        if (!command) return warn(message, 'Usage: `beta command add <command>`');
                        if (first('SELECT * FROM global_beta_commands WHERE command = ?', command)) {
                            return warn(message, `Command **${command}** is already in the beta program`);
                        }
                        run('INSERT INTO global_beta_commands (command, status, user, timestamp) VALUES (?, ?, ?, ?)',
                            command, 1, message.author.id, Date.now() / 1000);
                        return approve(message, `Added **${command}** to the beta program`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'beta command remove', description: 'Remove a command from the beta program', usage: ',beta command remove <command>' },
                    execute: async (message, args) => {
                        if (!await needManager(message)) return;
                        const command = resolveCommand(message, args[0]);
                        if (!command) return warn(message, 'Usage: `beta command remove <command>`');
                        if (!first('SELECT * FROM global_beta_commands WHERE command = ?', command)) {
                            return warn(message, `Command **${command}** isn't in the beta program`);
                        }
                        run('DELETE FROM global_beta_commands WHERE command = ?', command);
                        return approve(message, `Removed **${command}** from the beta program`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'beta command list', description: 'List all commands in the beta program', usage: ',beta command list' },
                    execute: async (message) => {
                        if (!await needManager(message)) return;
                        const rows = query('SELECT * FROM global_beta_commands');
                        if (!rows.length) return warn(message, 'There are no beta commands');
                        return paginate(message, rows.map(row => `${row.command} added by <@${row.user}>`), 'Beta commands', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL({ size: 256 }) || undefined
                        });
                    }
                }
            }
        }
    }
};
