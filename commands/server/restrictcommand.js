const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

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

function splitRoleCommand(message, args) {
    const role = resolveRole(message, args);
    if (!role) return { error: 'You must provide a role\n> Usage: `,restrictcommand add @role <command>`' };
    const command = args.filter((a) => !String(a).includes(role.id) && !String(a).includes(`<@&${role.id}>`)).join(' ').trim();
    if (!command) return { error: 'You must provide a command' };
    return { role, command };
}

function findCommand(message, name) {
    return message.client.commands.get(name) ||
        message.client.commands.get(message.client.aliases.get(name)) ||
        null;
}

module.exports = {
    permission: "manage guild",
    data: { name: 'restrictcommand', description: 'Only allows people with a certain role to use command', usage: ',restrictcommand <add|remove|list>' },
    aliases: ['restrictcmd', 'rc'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',restrictcommand add @booster snipe',
        remove: ',restrictcommand remove @booster snipe',
        list: ',restrictcommand list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: ['make'],
            data: { name: 'restrictcommand add', description: 'Allows the specified role exclusive permission to use a command or cog', usage: ',restrictcommand add @booster snipe' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const parsed = splitRoleCommand(message, args);
                if (parsed.error) return warn(message, parsed.error);
                const { role, command } = parsed;
                if (command.toLowerCase() === 'all') {
                    if (first('SELECT 1 AS ok FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, 'all', role.id)) {
                        return warn(message, `All commands are **already** restricted to ${role}`);
                    }
                    run('INSERT INTO restrictcommand (guild_id, command, role_id) VALUES (?, ?, ?)', message.guild.id, 'all', role.id);
                    return approve(message, `All commands are now restricted to members with ${role}`);
                }
                const cmd = findCommand(message, command);
                if (!cmd) return warn(message, `Command \`${command}\` does not exist`);
                if (['help', 'restrictcommand', 'disablecmd', 'enablecmd'].includes(cmd.data.name)) {
                    return message.reply({ content: 'no lol' });
                }
                const qualified = cmd.data.name;
                if (first('SELECT 1 AS ok FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, qualified, role.id)) {
                    return warn(message, `\`${qualified}\` is **already** restricted to ${role}`);
                }
                run('INSERT INTO restrictcommand (guild_id, command, role_id) VALUES (?, ?, ?)', message.guild.id, qualified, role.id);
                return approve(message, `Allowing members with ${role} to use \`${qualified}\``);
            }
        },
        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'restrictcommand remove', description: "Removes the specified role's exclusive permission to use a command or cog", usage: ',restrictcommand remove @booster snipe' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const parsed = splitRoleCommand(message, args);
                if (parsed.error) return warn(message, parsed.error);
                const { role, command } = parsed;
                if (command.toLowerCase() === 'all') {
                    if (!first('SELECT 1 AS ok FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, 'all', role.id)) {
                        return warn(message, `All commands are **not** restricted to ${role}`);
                    }
                    run('DELETE FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, 'all', role.id);
                    return approve(message, `All commands are no longer restricted to members with ${role}`);
                }
                const cmd = findCommand(message, command);
                if (!cmd) return warn(message, `Command \`${command}\` does not exist`);
                const qualified = cmd.data.name;
                if (!first('SELECT 1 AS ok FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, qualified, role.id)) {
                    return warn(message, `\`${qualified}\` is **not** restricted to ${role}`);
                }
                run('DELETE FROM restrictcommand WHERE guild_id = ? AND command = ? AND role_id = ?', message.guild.id, qualified, role.id);
                return approve(message, `No longer allowing members with ${role} to use \`${qualified}\``);
            }
        },
        list: {
            aliases: [],
            data: { name: 'restrictcommand list', description: 'View a list of every restricted command', usage: ',restrictcommand list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const results = query('SELECT * FROM restrictcommand WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** restricted commands');
                const entries = results.map((result) => {
                    const role = message.guild.roles.cache.get(String(result.role_id));
                    return `**${result.command}**: ${role ? `${role}` : `\`${result.role_id}\``}`;
                });
                return paginate(message, entries, 'Restricted Commands', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
