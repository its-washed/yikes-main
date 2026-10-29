const { PermissionFlagsBits } = require('discord.js');
const { query, run } = require('../../utils/database');
const { paginate, warn, approve } = require('../../utils/context');
const { needPerm, resolveUser } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { applyDescriptions } = require('../../utils/helpers');

function entryBlock(entry, showUser) {
    const lines = [`**Punished:** <t:${Math.floor(Number(entry.time))}:f>`];
    lines.push(showUser
        ? `**User:** <@${entry.user_id}> (\`${entry.user_id}\`)`
        : `**Moderator:** <@${entry.moderator_id}> (\`${entry.moderator_id}\`)`);
    lines.push(`**Reason:** ${entry.reason}`);
    if (entry.duration && entry.duration !== 'None') lines.push(`**Duration:** ${entry.duration}`);
    if (entry.proof) lines.push(`**Proof:** ${entry.proof}`);
    return `**Case Log #${entry.guild_id} | ${entry.punishment}**\n${lines.join('\n')}`;
}

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

async function listEntries(message, client, field, title, permission) {
    if (!await needPerm(message, permission)) return;
    const target = await resolveUser(message, client, args0(message));
    if (!target) return warn(message, `No user called **${args0(message)}** found`);

    const rows = query(`SELECT * FROM history WHERE server_id = ? AND ${field} = ? ORDER BY ${field === 'user_id' ? 'guild_id' : 'id'} DESC`,
        message.guild.id, target.id);

    if (!rows.length) {
        return warn(message, `No **moderation actions** have been recorded for ${target}`);
    }

    const lines = rows.map(entry => entryBlock(entry, field === 'moderator_id'));
    return paginate(message, lines, `${title} for ${target.username}`, guildAuthor(message), { perPage: 2 });
}

function args0(message) {
    return message.__args && message.__args.length ? message.__args[0] : null;
}

async function clearFor(message, client, field) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const value = message.__args && message.__args[0];
    if (!value) return warn(message, 'Usage: `history clear user <user>`');
    const target = await resolveUser(message, client, value);
    if (!target) return warn(message, `No user called **${value}** found`);

    const rows = query(`SELECT * FROM history WHERE server_id = ? AND ${field} = ?`, message.guild.id, target.id);
    if (!rows.length) return warn(message, `No history entries found for ${target}`);

    run(`DELETE FROM history WHERE server_id = ? AND ${field} = ?`, message.guild.id, target.id);
    return approve(message, `All history entries for ${target} have been cleared`);
}

module.exports = {
    data: { name: 'history', description: 'History of moderation actions', usage: ',history <user|moderator|remove|clear>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['clear', 'moderator', 'remove', 'user'],
    subUsages: {
        user: ',history user [user]',
        moderator: ',history moderator [user]',
        remove: ',history remove <id>'
    },
    subs: {
        user: {
            aliases: ['u'],
            execute: async (message, args, client) => {
                message.__args = args;
                return listEntries(message, client, 'user_id', 'Punishment History', PermissionFlagsBits.ManageMessages);
            }
        },
        moderator: {
            aliases: ['mod', 'm'],
            execute: async (message, args, client) => {
                message.__args = args;
                return listEntries(message, client, 'moderator_id', 'Moderation History', PermissionFlagsBits.ModerateMembers);
            }
        },
        remove: {
            aliases: [],
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const id = parseInt(args[0], 10);
                if (!Number.isFinite(id)) return warn(message, 'Usage: `history remove <id>`');
                const rows = query('SELECT * FROM history WHERE server_id = ? AND guild_id = ?', message.guild.id, id);
                if (!rows.length) return warn(message, `No history entry with ID **${id}** found`);
                run('DELETE FROM history WHERE server_id = ? AND guild_id = ?', message.guild.id, id);
                return approve(message, `History entry with ID **${id}** has been successfully removed`);
            }
        },
        clear: {
            aliases: [],
            data: { name: 'history clear', description: 'Clear punishment history', usage: ',history clear <user|moderator|all>' },
            subcommands: ['all', 'moderator', 'user'],
            subUsages: {
                user: ',history clear user <user>',
                moderator: ',history clear moderator <user>'
            },
            subs: {
                user: {
                    aliases: [],
                    execute: async (message, args, client) => {
                        message.__args = args;
                        return clearFor(message, client, 'user_id');
                    }
                },
                moderator: {
                    aliases: ['mod', 'm'],
                    execute: async (message, args, client) => {
                        message.__args = args;
                        return clearFor(message, client, 'moderator_id');
                    }
                },
                all: {
                    aliases: [],
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const rows = query('SELECT * FROM history WHERE server_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'No history entries found');
                        run('DELETE FROM history WHERE server_id = ?', message.guild.id);
                        return approve(message, 'All history entries have been cleared');
                    }
                }
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.clear)
        }
    },

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        return sendCard(message, module.exports);
    }
};

applyDescriptions(module.exports, {
    "history clear": "Clear punishment history",
    "history clear user": "Clear all punishment history for a user",
    "history clear moderator": "Clear all punishment history for a moderator",
    "history clear all": "Clear all punishment history for everyone",
    "history remove": "Remove a specific punishment entry by Guild ID",
    "history moderator": "View a list of every punishment recorded by a given moderator",
    "history user": "View a list of every punishment recorded of a given user"
});
