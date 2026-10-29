const { PermissionFlagsBits } = require('discord.js');
const { first } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm, formatTimespan } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { createEmbed, roleInputError } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

const DANGEROUS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ModerateMembers
];

const roleLocks = new Map();
const manageLocks = new Map();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function withLock(map, key, fn) {
    const prev = map.get(key) || Promise.resolve();
    const next = prev.then(() => fn(), () => fn());
    map.set(key, next.then(() => {}, () => {}));
    return next;
}

function parseList(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (err) {
        return [];
    }
}

function convertRole(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return { role: null, error: null, query: raw };
    const mentioned = message.mentions.roles.first();
    if (mentioned && raw.includes(mentioned.id)) return { role: mentioned, error: null, query: mentioned.name };
    const byId = message.guild.roles.cache.get(raw.replace(/[<@&>]/g, ''));
    if (byId) return { role: byId, error: null, query: byId.name };
    const name = raw.toLowerCase();
    const exact = message.guild.roles.cache.filter(r => r.id !== message.guild.id && r.name.toLowerCase() === name);
    if (exact.size === 1) return { role: exact.first(), error: null, query: raw };
    if (exact.size > 1) return { role: null, error: 'ambiguous', query: raw };
    const partial = message.guild.roles.cache.filter(r => r.id !== message.guild.id && r.name.toLowerCase().includes(name));
    if (partial.size === 1) return { role: partial.first(), error: null, query: raw };
    if (partial.size > 1) return { role: null, error: 'ambiguous', query: raw };
    return { role: null, error: 'notfound', query: raw };
}

function convertColor(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const hex = raw.replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(hex)) return parseInt(hex, 16);
    if (/^[0-9a-f]{3}$/i.test(hex)) return parseInt(hex.split('').map(c => c + c).join(''), 16);
    return null;
}

function isDangerous(role) {
    return DANGEROUS.some(flag => role.permissions.has(flag));
}

function isWhitelisted(message) {
    const row = first('SELECT * FROM antinuke WHERE guild_id = ?', message.guild.id);
    if (!row) return false;
    if (String(row.owner_id || '') === message.author.id) return true;
    return parseList(row.whitelisted).includes(message.author.id) ||
        parseList(row.admins).includes(message.author.id) ||
        parseList(row.staffs).includes(message.author.id);
}

function isModuleEnabled(guild, name) {
    return Boolean(first('SELECT * FROM antinuke_modules WHERE guild_id = ? AND module = ?', guild.id, name));
}

async function modifyAll(message, type, role, action) {
    const kind = String(type || '').toLowerCase();
    if (!['humans', 'bots', 'members'].includes(kind)) {
        return warn(message, 'Invalid type specified. Use `Humans`, `Bots`, or `Members`.');
    }
    let members = [];
    if (kind === 'humans') members = message.guild.members.cache.filter(m => !m.bot).map(m => m);
    else if (kind === 'bots') members = message.guild.members.cache.filter(m => m.bot).map(m => m);
    else members = message.guild.members.cache.map(m => m);

    const actionDescription = action === 'add' ? 'Added' : 'Removed';
    const preposition = action === 'add' ? 'to' : 'from';
    const tasks = members.filter(m => action === 'add'
        ? !m.roles.cache.has(role.id)
        : m.roles.cache.has(role.id));

    if (!tasks.length) {
        return warn(message, `No members to ${action === 'add' ? 'add' : 'remove'} the role.`);
    }

    return withLock(roleLocks, message.guild.id, async () => {
        const mes = await message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                description: `${actionDescription} ${role} ${preposition} **${tasks.length}** members.\n> This operation might take around **${formatTimespan(0.3 * tasks.length)}**`
            })]
        });
        let successCount = 0;
        const batchSize = 5;
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(member => {
                const fn = action === 'add'
                    ? member.roles.add(role, `Role all add invoked by ${message.author}`)
                    : member.roles.remove(role, `Role all remove invoked by ${message.author}`);
                return fn.then(() => null).catch(err => err);
            }));
            for (const result of results) {
                if (!result) successCount++;
            }
            if (i + batchSize < tasks.length) await sleep(5000);
        }
        const description = `${EMOJIS.APPROVE} ${message.author}: ${actionDescription} ${role} ${preposition} **${successCount}** members`;
        try {
            return await mes.edit({ embeds: [{ color: COLORS.SUCCESS, description }] });
        } catch (err) {
            return approve(message, `${actionDescription} ${role} ${preposition} **${successCount}** members`);
        }
    });
}

module.exports = {
    permission: "manage roles",
    data: { name: 'role', description: 'Add/remove roles to/from a member', usage: ',role [member] [roles]' },
    aliases: ['r'],
    cooldown: 5,
    subcommands: ['all', 'edit', 'create', 'delete', 'manage', 'copy'],
    execute: async (message, args) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
        const member = args[0] ? message.mentions.members.first() || message.guild.members.cache.get(String(args[0]).replace(/[<@!>]/g, '')) : null;
        const roles = args.slice(1).join(' ').trim();
        if (member && roles) return module.exports.subs.manage.execute(message, args);
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: all, edit, create, delete, manage, copy');
        return sendCard(message, module.exports);
    },
    subs: {
        all: {
            aliases: [],
            data: { name: 'role all', description: 'Add or remove roles from all members', usage: ',role all <add|remove>' },
            subcommands: ['add', 'remove'],
            execute: async (message) => sendCard(message, module.exports.subs.all),
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'role all add', description: 'Add a role to all members of a specified type (Humans, Bots, Members)', usage: ',role all add <type> <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!args[0] || !args.slice(1).join(' ')) return warn(message, 'Usage: `role all add <humans|bots|members> <role>`');
                        const found = convertRole(message, args.slice(1).join(' '));
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role all add <type> <role>')] });
                        return modifyAll(message, args[0], found.role, 'add');
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'role all remove', description: 'Remove a role from all members of a specified type (Humans, Bots, Members)', usage: ',role all remove <type> <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!args[0] || !args.slice(1).join(' ')) return warn(message, 'Usage: `role all remove <humans|bots|members> <role>`');
                        const found = convertRole(message, args.slice(1).join(' '));
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role all remove <type> <role>')] });
                        return modifyAll(message, args[0], found.role, 'remove');
                    }
                }
            }
        },
        edit: {
            aliases: [],
            data: { name: 'role edit', description: "Edit a role's name, icon & color", usage: ',role edit <name|icon|hoist|color>' },
            subcommands: ['name', 'icon', 'hoist', 'color'],
            execute: async (message) => sendCard(message, module.exports.subs.edit),
            subs: {
                name: {
                    aliases: [],
                    data: { name: 'role edit name', description: "Edit a role's name", usage: ',role edit name <role> <name>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const found = convertRole(message, args[0]);
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role edit name <role> <name>')] });
                        const name = args.slice(1).join(' ').trim();
                        if (!name) return warn(message, 'Usage: `role edit name <role> <name>`');
                        await found.role.edit({ name, reason: `Role name edited by ${message.author}` });
                        return approve(message, `Role name edited to **${name}**`);
                    }
                },
                icon: {
                    aliases: [],
                    data: { name: 'role edit icon', description: "Edit a role's icon", usage: ',role edit icon <role> <emoji|none>' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (Number(message.guild.premiumTier || 0) < 2) return warn(message, 'Role icons require this server to be **boost level 2**');
                        const found = convertRole(message, args[0]);
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role edit icon <role> <emoji>')] });
                        const emoji = args.slice(1).join(' ').trim();
                        if (!emoji) return warn(message, 'Usage: `role edit icon <role> <emoji|none>`');
                        if (emoji.toLowerCase() === 'none') {
                            await found.role.edit({ icon: null, unicodeEmoji: null, reason: `Role icon removed by ${message.author}` });
                            return approve(message, 'Role icon successfully removed');
                        }
                        const custom = /<(a?):(\w+):(\d+)>/.exec(emoji);
                        try {
                            if (custom) {
                                const id = custom[3];
                                const emojiObject = message.guild.emojis.cache.get(id) || client.emojis.cache.get(id);
                                const icon = emojiObject || `https://cdn.discordapp.com/emojis/${id}.${custom[1] ? 'gif' : 'png'}`;
                                await found.role.edit({ icon, reason: `Role icon edited by ${message.author}` });
                            } else {
                                await found.role.edit({ unicodeEmoji: emoji, reason: `Role icon edited by ${message.author}` });
                            }
                            return approve(message, `Role icon successfully changed to **${emoji}**`);
                        } catch (err) {
                            return warn(message, `Given emoji is invalid or there was an error: ${err.message}`);
                        }
                    }
                },
                hoist: {
                    aliases: [],
                    data: { name: 'role edit hoist', description: 'Make a role hoisted or not', usage: ',role edit hoist <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const found = convertRole(message, args.join(' '));
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role edit hoist <role>')] });
                        const hoist = !found.role.hoist;
                        await found.role.edit({ hoist, reason: `Role hoist edited by ${message.author}` });
                        return approve(message, `Role ${hoist ? 'is now hoisted' : 'is not hoisted anymore'}`);
                    }
                },
                color: {
                    aliases: ['colour'],
                    data: { name: 'role edit color', description: "Edit a role's color", usage: ',role edit color <role> <color>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const found = convertRole(message, args[0]);
                        if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role edit color <role> <color>')] });
                        const color = convertColor(args.slice(1).join(' '));
                        if (color === null) return warn(message, 'Usage: `role edit color <role> #ff00ff`');
                        await found.role.edit({ color, reason: `Color changed by ${message.author}` });
                        const hex = `#${color.toString(16).padStart(6, '0')}`;
                        return message.reply({ embeds: [createEmbed({ color, description: `${message.author}: Changed the role's color to \`${hex}\`` })] });
                    }
                }
            }
        },
        copy: {
            aliases: [],
            data: { name: 'role copy', description: "Copy a role's permissions to another role", usage: ',role copy <permissions|color|name|all>' },
            subcommands: ['permissions', 'color', 'name', 'all'],
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                return sendCard(message, module.exports.subs.copy);
            },
            subs: {
                permissions: {
                    aliases: [],
                    data: { name: 'role copy permissions', description: "Copy a role's permissions to another role", usage: ',role copy permissions <role> <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const source = convertRole(message, args[0]);
                        if (!source.role) return message.reply({ embeds: [roleInputError(source.error, source.query, ',role copy permissions <role> <target>')] });
                        const target = convertRole(message, args[1]);
                        if (!target.role) return message.reply({ embeds: [roleInputError(target.error, target.query, ',role copy permissions <role> <target>')] });
                        await target.role.edit({ permissions: source.role.permissions, reason: `Role permissions copied by ${message.author}` });
                        return approve(message, `Role permissions copied from ${source.role} to ${target.role}`);
                    }
                },
                color: {
                    aliases: ['colour'],
                    data: { name: 'role copy color', description: "Copy a role's color to another role", usage: ',role copy color <role> <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const source = convertRole(message, args[0]);
                        if (!source.role) return message.reply({ embeds: [roleInputError(source.error, source.query, ',role copy color <role> <target>')] });
                        const target = convertRole(message, args[1]);
                        if (!target.role) return message.reply({ embeds: [roleInputError(target.error, target.query, ',role copy color <role> <target>')] });
                        await target.role.edit({ color: source.role.color, reason: `Role color copied by ${message.author}` });
                        return approve(message, `Role color copied from ${source.role} to ${target.role}`);
                    }
                },
                name: {
                    aliases: [],
                    data: { name: 'role copy name', description: "Copy a role's name to another role", usage: ',role copy name <role> <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const source = convertRole(message, args[0]);
                        if (!source.role) return message.reply({ embeds: [roleInputError(source.error, source.query, ',role copy name <role> <target>')] });
                        const target = convertRole(message, args[1]);
                        if (!target.role) return message.reply({ embeds: [roleInputError(target.error, target.query, ',role copy name <role> <target>')] });
                        await target.role.edit({ name: source.role.name, reason: `Role name copied by ${message.author}` });
                        return approve(message, `Role name copied from ${source.role} to ${target.role}`);
                    }
                },
                all: {
                    aliases: [],
                    data: { name: 'role copy all', description: "Copy a role's name, color, permissions, hoist, icon, and more to another role", usage: ',role copy all <role> <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                        const source = convertRole(message, args[0]);
                        if (!source.role) return message.reply({ embeds: [roleInputError(source.error, source.query, ',role copy all <role> <target>')] });
                        const target = convertRole(message, args[1]);
                        if (!target.role) return message.reply({ embeds: [roleInputError(target.error, target.query, ',role copy all <role> <target>')] });
                        await target.role.edit({
                            name: source.role.name,
                            color: source.role.color,
                            permissions: source.role.permissions,
                            hoist: source.role.hoist,
                            mentionable: source.role.mentionable,
                            reason: `Role copied by ${message.author}`
                        });
                        return approve(message, `Role ${source.role} copied to ${target.role}`);
                    }
                }
            }
        },
        create: {
            aliases: [],
            data: { name: 'role create', description: 'Create a new role with an optional colour', usage: ',role create <name> [color]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const name = args[0];
                if (!name) return warn(message, 'Usage: `role create <name> [color]`');
                if (message.guild.roles.cache.some(role => role.name === name)) {
                    return warn(message, `A role with the name \`${name}\` already exists.`);
                }
                let color = 0;
                if (args[1]) {
                    color = convertColor(args[1]);
                    if (color === null) return warn(message, 'Usage: `role create <name> [color]`');
                }
                await message.guild.roles.create({ name, color, reason: `Role created by ${message.author}` });
                return approve(message, `Role \`${name}\` created successfully.`);
            }
        },
        delete: {
            aliases: [],
            data: { name: 'role delete', description: 'Delete an existing role', usage: ',role delete <role>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const found = convertRole(message, args.join(' '));
                if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role delete <role>')] });
                const me = message.guild.members.me;
                if (me && found.role.position > me.roles.highest.position) {
                    return warn(message, `Role ${found.role} is over my highest role`);
                }
                try {
                    await found.role.delete(`Role deleted by ${message.author}`);
                } catch (err) {
                    return warn(message, `I don't have permission to delete the role ${found.role}`);
                }
                return approve(message, `Role \`${found.role.name}\` deleted successfully.`);
            }
        },
        manage: {
            aliases: [],
            data: { name: 'role manage', description: 'Add/remove roles to/from a member', usage: ',role manage <member> <roles>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const member = args[0] ? message.mentions.members.first() || message.guild.members.cache.get(String(args[0]).replace(/[<@!>]/g, '')) : null;
                if (!member) return warn(message, 'Usage: `role manage <member> <roles>`');
                const parts = args.slice(1).join(' ').split(', ').map(part => part.trim()).filter(Boolean);
                if (!parts.length) return sendCard(message, module.exports.subs.manage);
                const roles = [];
                for (const part of parts) {
                    const found = convertRole(message, part);
                    if (!found.role) return message.reply({ embeds: [roleInputError(found.error, found.query, ',role manage <member> <roles>')] });
                    roles.push(found.role);
                }
                if (roles.length > 7) return warn(message, "You can't give more than 7 roles at once");

                let targets = roles;
                const whitelisted = isWhitelisted(message);
                if (targets.some(role => isDangerous(role)) && isModuleEnabled(message.guild, 'role giving') && !whitelisted) {
                    targets = targets.filter(role => !isDangerous(role));
                }
                const lockRow = first('SELECT * FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
                const lockedRoles = lockRow ? parseList(lockRow.roles) : [];
                const lockStatus = lockRow ? Boolean(lockRow.status) : false;
                if (lockStatus && !whitelisted) {
                    targets = targets.filter(role => !lockedRoles.includes(role.id));
                }
                if (!targets.length) {
                    return warn(message, "You can't give any roles with dangerous permissions or locked roles.");
                }

                return withLock(manageLocks, message.guild.id, async () => {
                    const marks = [];
                    for (const role of targets) {
                        if (!member.roles.cache.has(role.id)) {
                            await member.roles.add(role, `${message.author} added the role`);
                            marks.push(`**+**${role}`);
                        } else {
                            await member.roles.remove(role, `${message.author} removed the role`);
                            marks.push(`**-**${role}`);
                        }
                    }
                    return approve(message, `Edited ${member}'s roles: ${marks.join(', ')}`);
                });
            }
        }
    }
};
