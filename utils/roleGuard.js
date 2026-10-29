const { PermissionFlagsBits } = require('discord.js');
const { first } = require('./database');

const DANGEROUS_FLAGS = [
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageEvents,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManagePermissions,
    PermissionFlagsBits.ManageThreads,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.MuteMembers,
    PermissionFlagsBits.DeafenMembers,
    PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.Administrator
];

function findRole(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const byId = message.guild.roles.cache.get(raw.replace(/[<@&>]/g, ''));
    if (byId) return byId;
    const lower = raw.toLowerCase();
    const exact = message.guild.roles.cache.filter(r => r.id !== message.guild.id && r.name.toLowerCase() === lower);
    if (exact.size) return exact.first();
    const partial = message.guild.roles.cache.filter(r => r.id !== message.guild.id && r.name.toLowerCase().includes(lower));
    if (partial.size) return partial.first();
    return null;
}

function isDangerous(role) {
    return DANGEROUS_FLAGS.some(flag => role.permissions.has(flag));
}

function humanizeRole(guild, roleId) {
    const role = guild.roles.cache.get(String(roleId));
    if (role) return `${role}`;
    return `\`${roleId}\``;
}

async function dangerousRole(message, text, config) {
    const role = findRole(message, text);
    if (!role) return { role: null, error: `Role **${text}** couldn't be found` };

    const me = message.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return { role: null, error: 'Bot are **missing** the following permission: `manage_roles`' };
    }
    if (role.position >= me.roles.highest.position) {
        return { role: null, error: `Role **${text}** is over my highest role` };
    }
    if (role.managed || role.id === message.guild.id) {
        return { role: null, error: `Role **${text}** can't be managed by anyone` };
    }
    if (message.author.id === message.guild.ownerId) return { role };

    if (role.position >= message.member.roles.highest.position) {
        return { role: null, error: "You can't manage this role" };
    }

    if (isDangerous(role)) {
        const check = first('SELECT owner_id, admins FROM antinuke WHERE guild_id = ?', message.guild.id);
        if (check) {
            let allowed = [String(check.owner_id)];
            try {
                const admins = JSON.parse(check.admins || '[]');
                if (Array.isArray(admins)) allowed = allowed.concat(admins.map(String));
            } catch (err) {}
            if (!allowed.includes(String(message.author.id))) {
                return { role: null, error: "You **can't** use this command, you need to be an Antinuke admin" };
            }
            return { role };
        }
        const prefix = (config && config.prefix) || ',';
        return { role: null, error: `Antinuke is **not** configured\n> Use \`${prefix}antinuke setup\` to configure it` };
    }
    return { role };
}

async function newRole(message, text, config) {
    const role = findRole(message, text);
    if (!role) return { role: null, error: `Role **${text}** couldn't be found` };

    const me = message.guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return { role: null, error: 'Bot are **missing** the following permission: `manage_roles`' };
    }
    if (role.position >= me.roles.highest.position) {
        return { role: null, error: `Role **${text}** is over my highest role` };
    }
    if (role.managed || role.id === message.guild.id) {
        return { role: null, error: `Role **${text}** can't be managed by anyone` };
    }
    if (message.author.id === message.guild.ownerId) return { role };
    if (role.position >= message.member.roles.highest.position) {
        return { role: null, error: "You can't manage this role" };
    }
    return { role };
}

module.exports = { findRole, isDangerous, humanizeRole, dangerousRole, newRole, DANGEROUS_FLAGS };
