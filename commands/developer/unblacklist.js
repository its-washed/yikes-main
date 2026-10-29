const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needModerator, staffLog, rankOf } = require('../../utils/staff');

function resolveCommand(message, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (message.client.commands.has(name)) return name;
    return message.client.aliases.get(name) || null;
}

async function parseTarget(message, token) {
    if (!token) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned) return { kind: 'user', id: mentioned.id, label: mentioned.toString() };
    const cleaned = String(token).replace(/[<@!>]/g, '');
    if (!/^\d{16,22}$/.test(cleaned)) return null;
    const user = await message.client.users.fetch(cleaned).catch(() => null);
    if (user) return { kind: 'user', id: user.id, label: `<@${user.id}>` };
    const guild = await message.client.guilds.fetch(cleaned).catch(() => null);
    if (guild) return { kind: 'server', id: guild.id, label: guild.name };
    return null;
}

function canRemove(message, existing) {
    if (String(existing.moderator_id) === String(message.author.id)) return true;
    return rankOf(message.author.id) >= rankOf(existing.moderator_id);
}

module.exports = {
    permission: "bot manager",
    data: { name: 'unblacklist', description: 'Unblacklist commands', usage: ',unblacklist <user|server|command|cog>' },
    aliases: [],
    cooldown: 0,
    subcommands: ['user', 'server', 'command', 'cog'],
    execute: async (message, args) => {
        if (!await needModerator(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: user, server, command, cog');
        return sendCard(message, module.exports);
    },
    subs: {
        user: {
            aliases: [],
            data: { name: 'unblacklist user', description: 'Unblacklist a user', usage: ',unblacklist user <user>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed || parsed.kind !== 'user') return warn(message, 'Usage: `unblacklist user <user>`');
                const existing = first('SELECT * FROM blacklist_user WHERE user_id = ?', parsed.id);
                if (!existing) return warn(message, `User ${parsed.label} isn't blacklisted`);
                if (!canRemove(message, existing)) {
                    return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label}`);
                }
                run('DELETE FROM blacklist_user WHERE user_id = ?', parsed.id);
                await staffLog(client, message.author, `Unblacklisted user ${parsed.label}`, 'blacklist');
                return approve(message, `Unblacklisted user ${parsed.label}`);
            }
        },
        server: {
            aliases: [],
            data: { name: 'unblacklist server', description: 'Unblacklist a server', usage: ',unblacklist server <server>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed || parsed.kind !== 'server') return warn(message, 'Usage: `unblacklist server <server>`');
                const existing = first('SELECT * FROM blacklist_server WHERE guild_id = ?', parsed.id);
                if (!existing) return warn(message, `Server ${parsed.label} isn't blacklisted`);
                if (!canRemove(message, existing)) {
                    return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label}`);
                }
                run('DELETE FROM blacklist_server WHERE guild_id = ?', parsed.id);
                await staffLog(client, message.author, `Unblacklisted server ${parsed.label}`, 'blacklist');
                return approve(message, `Unblacklisted server ${parsed.label}`);
            }
        },
        command: {
            aliases: [],
            data: { name: 'unblacklist command', description: 'Unblacklist a user or server from a command', usage: ',unblacklist command <target> <command>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                const command = resolveCommand(message, args[1]);
                if (!parsed || !command) return warn(message, 'Usage: `unblacklist command <target> <command>`');
                if (parsed.kind === 'user') {
                    const existing = first('SELECT * FROM blacklist_command WHERE user_id = ? AND command = ?', parsed.id, command);
                    if (!existing) return warn(message, `User ${parsed.label} isn't blacklisted from the command \`${command}\``);
                    if (!canRemove(message, existing)) {
                        return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label} from the command \`${command}\``);
                    }
                    run('DELETE FROM blacklist_command WHERE user_id = ? AND command = ?', parsed.id, command);
                    await staffLog(client, message.author, `Unblacklisted user ${parsed.label} from the command \`${command}\``, 'blacklist');
                    return approve(message, `Unblacklisted user ${parsed.label} from the command \`${command}\``);
                }
                const existing = first('SELECT * FROM blacklist_command_server WHERE guild_id = ? AND command = ?', parsed.id, command);
                if (!existing) return warn(message, `Server ${parsed.label} isn't blacklisted from the command \`${command}\``);
                if (!canRemove(message, existing)) {
                    return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label} from the command \`${command}\``);
                }
                run('DELETE FROM blacklist_command_server WHERE guild_id = ? AND command = ?', parsed.id, command);
                await staffLog(client, message.author, `Unblacklisted server ${parsed.label} from the command \`${command}\``, 'blacklist');
                return approve(message, `Unblacklisted server ${parsed.label} from the command \`${command}\``);
            }
        },
        cog: {
            aliases: [],
            data: { name: 'unblacklist cog', description: 'Unblacklist a user or server from a cog', usage: ',unblacklist cog <target> <cog>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                const { COGS } = require('../../utils/staff');
                const cog = String(args[1] || '').toLowerCase();
                if (!parsed || !COGS.includes(cog)) return warn(message, 'Usage: `unblacklist cog <target> <cog>`');
                if (parsed.kind === 'user') {
                    const existing = first('SELECT * FROM blacklist_cog WHERE user_id = ? AND cog = ?', parsed.id, cog);
                    if (!existing) return warn(message, `User ${parsed.label} isn't blacklisted from the cog \`${cog}\``);
                    if (!canRemove(message, existing)) {
                        return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label} from the cog \`${cog}\``);
                    }
                    run('DELETE FROM blacklist_cog WHERE user_id = ? AND cog = ?', parsed.id, cog);
                    await staffLog(client, message.author, `Unblacklisted user ${parsed.label} from the cog \`${cog}\``, 'blacklist');
                    return approve(message, `Unblacklisted user ${parsed.label} from the cog \`${cog}\``);
                }
                const existing = first('SELECT * FROM blacklist_cog_server WHERE guild_id = ? AND cog = ?', parsed.id, cog);
                if (!existing) return warn(message, `Server ${parsed.label} isn't blacklisted from the cog \`${cog}\``);
                if (!canRemove(message, existing)) {
                    return warn(message, `Your rank must be higher than or equal to <@${existing.moderator_id}> to unblacklist ${parsed.label} from the cog \`${cog}\``);
                }
                run('DELETE FROM blacklist_cog_server WHERE guild_id = ? AND cog = ?', parsed.id, cog);
                await staffLog(client, message.author, `Unblacklisted server ${parsed.label} from the cog \`${cog}\``, 'blacklist');
                return approve(message, `Unblacklisted server ${parsed.label} from the cog \`${cog}\``);
            }
        }
    }
};
