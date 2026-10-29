const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { humanizeTime } = require('../../utils/helpers');

function resolveRole(message, args) {
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const raw = String(args.join(' ') || '').trim().replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(raw)) return message.guild.roles.cache.get(raw) || null;
    if (raw) {
        const exact = message.guild.roles.cache.find((r) => r.name.toLowerCase() === raw.toLowerCase());
        if (exact) return exact;
    }
    return null;
}

module.exports = {
    data: { name: 'pingtimeout', description: 'Manage ping timeout', usage: ',pingtimeout <add|remove|list>' },
    aliases: ['pto'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',pingtimeout add @games 5m',
        remove: ',pingtimeout remove @games',
        list: ',pingtimeout list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'pingtimeout add', description: 'Add a role to ping timeout', usage: ',pingtimeout add @games 5m' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const role = resolveRole(message, args);
                if (!role) return warn(message, 'You must mention a role\n> Usage: `,pingtimeout add @games 5m`');
                const timeArg = args.filter((a) => !String(a).includes(role.id)).find((a) => /^\d+[smhd]$/.test(String(a)));
                const timeout = timeArg ? parseTime(timeArg) : null;
                if (!timeout) return warn(message, 'You must provide a timeout\n> Usage: `,pingtimeout add @games 5m`');
                if (first('SELECT 1 AS ok FROM pingtimeout WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id)) {
                    return warn(message, `Role ${role} already exist for ping timeout`);
                }
                try {
                    await role.setMentionable(true, 'ping timeout');
                } catch (err) {}
                run('INSERT INTO pingtimeout (guild_id, role_id, timeout, last_ping) VALUES (?, ?, ?, 0)',
                    message.guild.id, role.id, timeout);
                return approve(message, `Added ${role} with a ${humanizeTime(timeout)} timeout`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'pingtimeout remove', description: 'Remove a role from ping timeout', usage: ',pingtimeout remove @games' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const role = resolveRole(message, args);
                const roleId = role ? role.id : String(args.join(' ') || '').replace(/[<@&>]/g, '');
                if (!/^\d{17,20}$/.test(roleId)) return warn(message, 'You must mention a role\n> Usage: `,pingtimeout remove @games`');
                if (!first('SELECT 1 AS ok FROM pingtimeout WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId)) {
                    return warn(message, `Role ${role ? `${role}` : `<@&${roleId}>`} not exist for ping timeout`);
                }
                run('DELETE FROM pingtimeout WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId);
                return approve(message, `Removed ${role ? `${role}` : `<@&${roleId}>`} from ping timeout`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'pingtimeout list', description: 'List all ping timeout roles', usage: ',pingtimeout list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const results = query('SELECT role_id, timeout, last_ping FROM pingtimeout WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no ping timeout roles set');
                const entries = results.map((result) => {
                    const role = message.guild.roles.cache.get(String(result.role_id));
                    const timeout = humanizeTime(Number(result.timeout) || 0);
                    const lastPing = result.last_ping ? `<t:${Math.floor(result.last_ping)}:R>` : 'never';
                    return `${role ? `${role}` : `<@&${result.role_id}>`} - ${timeout} (${lastPing})`;
                });
                return paginate(message, entries, 'Ping Timeout Roles', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
