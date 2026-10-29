const { query } = require('../../utils/database');
const { warn, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needModerator, guildName } = require('../../utils/staff');
const { isDeveloper } = require('../../utils/developer');

function usageLine(row, withUser) {
    const user = `<@${row.user_id}>`;
    const args = row.arguments || 'N/A';
    const stamp = Math.floor(Number(row.timestamp || 0));
    const text = `**${row.command}** (${args}) - <t:${stamp}:R>`;
    return withUser ? `${user} ${text}` : text;
}

function authorInfo(message) {
    return { name: message.author.username, icon_url: message.author.displayAvatarURL({ size: 256 }) };
}

function resolveCommand(message, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (message.client.commands.has(name)) return name;
    return message.client.aliases.get(name) || null;
}

module.exports = {
    permission: "bot moderator",
    data: { name: 'usage', description: 'Usage commands', usage: ',usage <recent|user|server|command|commands|servers|users|economy>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['recent', 'user', 'server', 'command', 'commands', 'servers', 'users', 'economy'],
    execute: async (message, args) => {
        if (!await needModerator(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: recent, user, server, command, commands, servers, users, economy');
        return sendCard(message, module.exports);
    },
    subs: {
        recent: {
            aliases: [],
            data: { name: 'usage recent', description: 'View the most recent uses of a specific command', usage: ',usage recent [command]' },
            execute: async (message, args) => {
                if (!await needModerator(message)) return;
                const command = args[0] ? resolveCommand(message, args[0]) : null;
                const rows = command
                    ? query('SELECT user_id, server_id, command, arguments, timestamp FROM command_history WHERE command = ? ORDER BY timestamp DESC LIMIT 500', command)
                    : query('SELECT user_id, server_id, command, arguments, timestamp FROM command_history ORDER BY timestamp DESC LIMIT 500');
                if (!rows.length) return warn(message, `No usage found for \`${command || ''}\``);
                return paginate(message, rows.map(row => usageLine(row, true)), 'Recent Command Usage', authorInfo(message));
            }
        },
        user: {
            aliases: [],
            data: { name: 'usage user', description: 'View all uses of a specific command by a user', usage: ',usage user <user> [command]' },
            execute: async (message, args) => {
                if (!await needModerator(message)) return;
                const target = await message.client.users.fetch(String(args[0] || '').replace(/[<@!>]/g, '')).catch(() => null);
                if (!target) return warn(message, 'Usage: `usage user <user> [command]`');
                if (isDeveloper(target.id) && !isDeveloper(message.author.id)) return warn(message, "You can't lookup **bot owners**");
                const command = args[1] ? resolveCommand(message, args[1]) : null;
                const rows = command
                    ? query('SELECT user_id, command, arguments, timestamp FROM command_history WHERE user_id = ? AND command = ? ORDER BY timestamp DESC', target.id, command)
                    : query('SELECT user_id, command, arguments, timestamp FROM command_history WHERE user_id = ? ORDER BY timestamp DESC', target.id);
                if (!rows.length) return warn(message, `No usage found for <@${target.id}> with \`${command || ''}\``);
                return paginate(message, rows.map(row => usageLine(row, false)), 'Command usage', {
                    name: target.username,
                    icon_url: target.displayAvatarURL({ size: 256 })
                });
            }
        },
        server: {
            aliases: [],
            data: { name: 'usage server', description: 'View all uses of a specific command by a server', usage: ',usage server <server> [command]' },
            execute: async (message, args) => {
                if (!await needModerator(message)) return;
                const server = String(args[0] || '').replace(/[^\d]/g, '');
                if (!server) return warn(message, 'Usage: `usage server <server> [command]`');
                const command = args[1] ? resolveCommand(message, args[1]) : null;
                const rows = command
                    ? query('SELECT user_id, command, arguments, timestamp FROM command_history WHERE server_id = ? AND command = ? ORDER BY timestamp DESC', server, command)
                    : query('SELECT user_id, command, arguments, timestamp FROM command_history WHERE server_id = ? ORDER BY timestamp DESC', server);
                if (!rows.length) return warn(message, `No usage found for **${server}** with \`${command || ''}\``);
                const guild = message.client.guilds.cache.get(server);
                return paginate(message, rows.map(row => usageLine(row, true)), 'Command usage', {
                    name: guildName(message.client, server, true),
                    icon_url: guild && guild.icon ? guild.iconURL({ size: 256 }) : undefined
                });
            }
        },
        command: {
            aliases: [],
            data: { name: 'usage command', description: 'View all uses of a specific command', usage: ',usage command <command>' },
            execute: async (message, args) => {
                if (!await needModerator(message)) return;
                const command = resolveCommand(message, args[0]);
                if (!command) return warn(message, 'Usage: `usage command <command>`');
                const rows = query('SELECT user_id, command, arguments, timestamp FROM command_history WHERE command = ? ORDER BY timestamp DESC', command);
                if (!rows.length) return warn(message, `No usage found for \`${command}\``);
                return paginate(message, rows.map(row => usageLine(row, true)), `Command usage for \`${command}\``, authorInfo(message));
            }
        },
        commands: {
            aliases: [],
            data: { name: 'usage commands', description: 'View the top 100 most used commands', usage: ',usage commands' },
            execute: async (message) => {
                if (!await needModerator(message)) return;
                const rows = query('SELECT command, COUNT(command) AS usage_count FROM command_history GROUP BY command ORDER BY usage_count DESC LIMIT 1500');
                const total = query('SELECT COUNT(*) AS total FROM command_history')[0];
                if (!rows.length) return warn(message, 'No usage found');
                const lines = rows.map(row => `**${row.command}** - ${Number(row.usage_count).toLocaleString('en-US')}`);
                return paginate(message, lines, `Commands Usage (${Number(total ? total.total : 0).toLocaleString('en-US')})`, authorInfo(message));
            }
        },
        servers: {
            aliases: [],
            data: { name: 'usage servers', description: 'View the top 100 most active servers', usage: ',usage servers' },
            execute: async (message) => {
                if (!await needModerator(message)) return;
                const rows = query('SELECT server_id, COUNT(*) AS usage_count FROM command_history GROUP BY server_id ORDER BY usage_count DESC');
                if (!rows.length) return warn(message, 'No server usage found');
                const lines = rows.map(row => `**${guildName(message.client, row.server_id, true)}** - ${Number(row.usage_count).toLocaleString('en-US')}`);
                return paginate(message, lines, 'Servers Usage', authorInfo(message));
            }
        },
        users: {
            aliases: [],
            data: { name: 'usage users', description: 'View the top 100 most active users', usage: ',usage users' },
            execute: async (message) => {
                if (!await needModerator(message)) return;
                const rows = query('SELECT user_id, COUNT(*) AS usage_count FROM command_history GROUP BY user_id ORDER BY usage_count DESC');
                if (!rows.length) return warn(message, 'No user usage found');
                const lines = rows.map(row => `<@${row.user_id}> - ${Number(row.usage_count).toLocaleString('en-US')}`);
                return paginate(message, lines, 'Users Usage', authorInfo(message));
            }
        },
        economy: {
            aliases: [],
            data: { name: 'usage economy', description: 'Economy commands', usage: ',usage economy <user>' },
            subcommands: ['user'],
            execute: async (message) => {
                if (!await needModerator(message)) return;
                return sendCard(message, module.exports.subs.economy);
            },
            subs: {
                user: {
                    aliases: [],
                    data: { name: 'usage economy user', description: 'View all economy transactions of a user', usage: ',usage economy user <user>' },
                    execute: async (message, args) => {
                        if (!await needModerator(message)) return;
                        const target = await message.client.users.fetch(String(args[0] || '').replace(/[<@!>]/g, '')).catch(() => null);
                        if (!target) return warn(message, 'Usage: `usage economy user <user>`');
                        const rows = query('SELECT * FROM economy_logs WHERE user_id = ? ORDER BY created DESC LIMIT 500', target.id);
                        if (!rows.length) return warn(message, `No economy transactions found for <@${target.id}>`);
                        const lines = rows.map(row => `${Number(row.amount).toFixed(2)} ${row.action} ${row.type} - <t:${Math.floor(Number(row.created))}:R>`);
                        return paginate(message, lines, `Economy transactions for ${target.username}`, authorInfo(message));
                    }
                }
            }
        }
    }
};
