const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

const MODULES = ['fun', 'economy', 'utility', 'moderation', 'server', 'voice', 'music', 'lastfm', 'developer', 'config'];

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

function splitRoleModule(message, args) {
    const role = resolveRole(message, args);
    if (!role) return { error: 'You must provide a role\n> Usage: `,restrictmodule add @role fun`' };
    const module = args.filter((a) => !String(a).includes(role.id)).join(' ').trim().toLowerCase();
    if (!module) return { error: 'You must provide a module' };
    return { role, module };
}

module.exports = {
    permission: "manage guild",
    data: { name: 'restrictmodule', description: 'Restrict a module to a role', usage: ',restrictmodule <add|remove|list>' },
    aliases: ['restrictmod', 'rm'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',restrictmodule add @booster fun',
        remove: ',restrictmodule remove @booster fun',
        list: ',restrictmodule list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: ['make'],
            data: { name: 'restrictmodule add', description: 'Restrict a module to a role', usage: ',restrictmodule add @booster fun' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const parsed = splitRoleModule(message, args);
                if (parsed.error) return warn(message, parsed.error);
                const { role, module } = parsed;
                if (!MODULES.includes(module)) return warn(message, `Invalid module\n> Valid: ${MODULES.map((entry) => `\`${entry}\``).join(', ')}`);
                if (first('SELECT 1 AS ok FROM restrictmodule WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, module, role.id)) {
                    return warn(message, `\`${module}\` is **already** restricted to ${role}`);
                }
                run('INSERT INTO restrictmodule (guild_id, command, role_id) VALUES (?, ?, ?)', message.guild.id, module, role.id);
                return approve(message, `Restricting \`${module}\` to members with ${role}`);
            }
        },
        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'restrictmodule remove', description: "Remove a module's restriction from a role", usage: ',restrictmodule remove @booster fun' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const parsed = splitRoleModule(message, args);
                if (parsed.error) return warn(message, parsed.error);
                const { role, module } = parsed;
                if (!first('SELECT 1 AS ok FROM restrictmodule WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, module, role.id)) {
                    return warn(message, `\`${module}\` is **not** restricted to ${role}`);
                }
                run('DELETE FROM restrictmodule WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, module, role.id);
                return approve(message, `Removing \`${module}\` restriction from ${role}`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'restrictmodule list', description: 'View a list of every restricted module', usage: ',restrictmodule list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const results = query('SELECT * FROM restrictmodule WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** restricted modules');
                const entries = results.map((result) => {
                    const role = message.guild.roles.cache.get(String(result.role_id));
                    return `**${result.command}**: ${role ? `${role}` : `\`${result.role_id}\``}`;
                });
                return paginate(message, entries, 'Restricted Modules', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
