const { first, run, query } = require('../../utils/database');
const { warn, approve, parseTime } = require('../../utils/context');
const { humanizeTime } = require('../../utils/helpers');
const { sendCard } = require('../../utils/helpCard');
const { needModerator, staffLog, COGS } = require('../../utils/staff');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

const CATEGORIES = COGS;

function durationText(duration) {
    return duration ? `for **${humanizeTime(Number(duration))}**` : '**permanently**';
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

function resolveCommand(message, token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    if (message.client.commands.has(name)) return name;
    const alias = message.client.aliases.get(name);
    return alias || null;
}

function resolveCog(token) {
    const name = String(token || '').toLowerCase();
    if (!name) return null;
    return CATEGORIES.find(cog => cog.toLowerCase() === name) || null;
}

function parseArguments(message, args, needsCommand, needsCog) {
    const target = args[0];
    let index = 1;
    let command = null;
    let cog = null;
    if (needsCommand) {
        command = resolveCommand(message, args[index]);
        if (command) index++;
    }
    if (needsCog) {
        cog = resolveCog(args[index]);
        if (cog) index++;
    }
    let duration = null;
    const maybeDuration = parseTime(args[index]);
    if (maybeDuration && args.length > index + 1) {
        duration = maybeDuration;
        index++;
    }
    const reason = args.slice(index).join(' ').trim();
    return { target, command, cog, duration, reason };
}

function alreadyWarn(existing, label) {
    return `Target ${label} is already blacklisted ${durationText(existing.duration)} by <@${existing.moderator_id}> (<t:${Math.floor(existing.timestamp)}:R>).\n\`\`\`${existing.reason}\`\`\``;
}

function buildEntries(message, rows, kind) {
    const entries = [];
    for (const row of rows) {
        if (kind === 'command') entries.push(`**Command** (\`${row.command}\`) ${durationText(row.duration)} by <@${row.moderator_id}> (<t:${Math.floor(row.timestamp)}:R>)\n\`\`\`${row.reason}\`\`\``);
        else entries.push(`**Cog** (\`${row.cog}\`) ${durationText(row.duration)} by <@${row.moderator_id}> (<t:${Math.floor(row.timestamp)}:R>)\n\`\`\`${row.reason}\`\`\``);
    }
    return entries;
}

module.exports = {
    permission: "bot manager",
    data: { name: 'blacklist', description: 'Blacklist commands', usage: ',blacklist <user|server|command|cog|check>' },
    aliases: [],
    cooldown: 0,
    subcommands: ['user', 'server', 'command', 'cog', 'check'],
    execute: async (message, args) => {
        if (!await needModerator(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: user, server, command, cog, check');
        return sendCard(message, module.exports);
    },
    subs: {
        user: {
            aliases: [],
            data: { name: 'blacklist user', description: 'Blacklist a user permanently or temporarily', usage: ',blacklist user <user> [duration] <reason>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed || parsed.kind !== 'user') return warn(message, 'Usage: `blacklist user <user> [duration] <reason>`');
                const { duration, reason } = parseArguments(message, args, false, false);
                if (!reason) return warn(message, 'Usage: `blacklist user <user> [duration] <reason>`');
                const existing = first('SELECT * FROM blacklist_user WHERE user_id = ?', parsed.id);
                if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                run('INSERT INTO blacklist_user (user_id, moderator_id, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
                    parsed.id, message.author.id, duration, reason, Date.now() / 1000);
                const text = `Blacklisted user ${parsed.label} ${durationText(duration)}. Reason:\n\`\`\`${reason}\`\`\``;
                await staffLog(client, message.author, text, 'blacklist');
                return approve(message, text);
            }
        },
        server: {
            aliases: [],
            data: { name: 'blacklist server', description: 'Blacklist a server permanently or temporarily', usage: ',blacklist server <server> [duration] <reason>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed || parsed.kind !== 'server') return warn(message, 'Usage: `blacklist server <server> [duration] <reason>`');
                const { duration, reason } = parseArguments(message, args, false, false);
                if (!reason) return warn(message, 'Usage: `blacklist server <server> [duration] <reason>`');
                const existing = first('SELECT * FROM blacklist_server WHERE guild_id = ?', parsed.id);
                if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                run('INSERT INTO blacklist_server (guild_id, moderator_id, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?)',
                    parsed.id, message.author.id, duration, reason, Date.now() / 1000);
                const text = `Blacklisted server ${parsed.label} ${durationText(duration)}.\n\`\`\`${reason}\`\`\``;
                await staffLog(client, message.author, text, 'blacklist');
                return approve(message, text);
            }
        },
        command: {
            aliases: [],
            data: { name: 'blacklist command', description: 'Blacklist a user or server from a command permanently or temporarily', usage: ',blacklist command <target> <command> [duration] <reason>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed) return warn(message, 'Usage: `blacklist command <target> <command> [duration] <reason>`');
                const { command, duration, reason } = parseArguments(message, args, true, false);
                if (!command || !reason) return warn(message, 'Usage: `blacklist command <target> <command> [duration] <reason>`');
                if (parsed.kind === 'user') {
                    const existing = first('SELECT * FROM blacklist_command WHERE user_id = ? AND command = ?', parsed.id, command);
                    if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                    run('INSERT INTO blacklist_command (user_id, moderator_id, command, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                        parsed.id, message.author.id, command, duration, reason, Date.now() / 1000);
                    const text = `Blacklisted user ${parsed.label} from the command \`${command}\` ${durationText(duration)}.\n\`\`\`${reason}\`\`\``;
                    await staffLog(client, message.author, text, 'blacklist');
                    return approve(message, text);
                }
                const existing = first('SELECT * FROM blacklist_command_server WHERE guild_id = ? AND command = ?', parsed.id, command);
                if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                run('INSERT INTO blacklist_command_server (guild_id, moderator_id, command, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                    parsed.id, message.author.id, command, duration, reason, Date.now() / 1000);
                const text = `Blacklisted server ${parsed.label} from the command \`${command}\` ${durationText(duration)}.\n\`\`\`${reason}\`\`\``;
                await staffLog(client, message.author, text, 'blacklist');
                return approve(message, text);
            }
        },
        cog: {
            aliases: [],
            data: { name: 'blacklist cog', description: 'Blacklist a user or server from a cog permanently or temporarily', usage: ',blacklist cog <target> <cog> [duration] <reason>' },
            execute: async (message, args, client) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed) return warn(message, 'Usage: `blacklist cog <target> <cog> [duration] <reason>`');
                const { cog, duration, reason } = parseArguments(message, args, false, true);
                if (!cog || !reason) return warn(message, 'Usage: `blacklist cog <target> <cog> [duration] <reason>`');
                if (parsed.kind === 'user') {
                    const existing = first('SELECT * FROM blacklist_cog WHERE user_id = ? AND cog = ?', parsed.id, cog);
                    if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                    run('INSERT INTO blacklist_cog (user_id, moderator_id, cog, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                        parsed.id, message.author.id, cog, duration, reason, Date.now() / 1000);
                    const text = `Blacklisted user ${parsed.label} from the cog \`${cog}\` ${durationText(duration)}.\n\`\`\`${reason}\`\`\``;
                    await staffLog(client, message.author, text, 'blacklist');
                    return approve(message, text);
                }
                const existing = first('SELECT * FROM blacklist_cog_server WHERE guild_id = ? AND cog = ?', parsed.id, cog);
                if (existing) return warn(message, alreadyWarn(existing, parsed.label));
                run('INSERT INTO blacklist_cog_server (guild_id, moderator_id, cog, duration, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                    parsed.id, message.author.id, cog, duration, reason, Date.now() / 1000);
                const text = `Blacklisted server ${parsed.label} from the cog \`${cog}\` ${durationText(duration)}.\n\`\`\`${reason}\`\`\``;
                await staffLog(client, message.author, text, 'blacklist');
                return approve(message, text);
            }
        },
        check: {
            aliases: [],
            data: { name: 'blacklist check', description: 'Check if a user or server is blacklisted and list all blacklists', usage: ',blacklist check <target>' },
            execute: async (message, args) => {
                if (!await needModerator(message)) return;
                const parsed = await parseTarget(message, args[0]);
                if (!parsed) return warn(message, 'Usage: `blacklist check <target>`');
                const entries = [];
                if (parsed.kind === 'user') {
                    const global = first('SELECT * FROM blacklist_user WHERE user_id = ?', parsed.id);
                    if (global) {
                        entries.push(`**Global** ${durationText(global.duration)} by <@${global.moderator_id}> (<t:${Math.floor(global.timestamp)}:R>)\n\`\`\`${global.reason}\`\`\``);
                    }
                    entries.push(...buildEntries(message, query('SELECT * FROM blacklist_command WHERE user_id = ?', parsed.id), 'command'));
                    entries.push(...buildEntries(message, query('SELECT * FROM blacklist_cog WHERE user_id = ?', parsed.id), 'cog'));
                    if (!entries.length) return approve(message, `User ${parsed.label} is not blacklisted`);
                } else {
                    const global = first('SELECT * FROM blacklist_server WHERE guild_id = ?', parsed.id);
                    if (global) {
                        entries.push(`**Global** ${durationText(global.duration)} by <@${global.moderator_id}> (<t:${Math.floor(global.timestamp)}:R>)\n\`\`\`${global.reason}\`\`\``);
                    }
                    entries.push(...buildEntries(message, query('SELECT * FROM blacklist_command_server WHERE guild_id = ?', parsed.id), 'command'));
                    entries.push(...buildEntries(message, query('SELECT * FROM blacklist_cog_server WHERE guild_id = ?', parsed.id), 'cog'));
                    if (!entries.length) return approve(message, `Server ${parsed.label} is not blacklisted`);
                }
                const pages = [];
                for (let i = 0; i < entries.length; i += 3) pages.push(entries.slice(i, i + 3));
                const embeds = pages.map((chunk, index) => {
                    const embed = createEmbed({
                        color: COLORS.NEUTRAL,
                        title: `Blacklists for ${parsed.label}`,
                        description: chunk.join('\n'),
                        footer: { text: `Page ${index + 1}/${pages.length} (${entries.length} entries)` }
                    });
                    return embed;
                });
                const { Paginator } = require('../../utils/pagination');
                const paginator = new Paginator(embeds, { userId: message.author.id });
                const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: pages.length > 1 ? [paginator.buildRow()] : [] });
                if (pages.length > 1) await paginator.start(message.channel, sent);
                return sent;
            }
        }
    }
};
