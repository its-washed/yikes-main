const { PermissionFlagsBits } = require('discord.js');
const { needPerm, prefix } = require('../../utils/moderation');
const { approve, warn, paginate } = require('../../utils/context');
const { first, query, run } = require('../../utils/database');
const { sendCard } = require('../../utils/helpCard');
const { applyDescriptions } = require('../../utils/helpers');

function roleName(guild, value) {
    const id = String(value || '').replace(/[<@&>]/g, '');
    const role = guild.roles.cache.get(id);
    if (role) return role.toString();
    return `<@&${id}>`;
}

function channelName(guild, value) {
    const id = String(value || '').replace(/[<#>]/g, '');
    const channel = guild.channels.cache.get(id);
    if (channel) return `${channel}`;
    return `<#${id}>`;
}

function resolveRole(message, value) {
    if (!value) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = String(value).replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.roles.cache.get(id) || null;
    const name = String(value).toLowerCase();
    const matches = message.guild.roles.cache.filter(role => role.id !== message.guild.id && role.name.toLowerCase() === name);
    if (matches.size === 1) return matches.first();
    return null;
}

function resolveChannel(message, value) {
    if (!value) return null;
    const id = String(value).replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    const name = String(value).toLowerCase();
    const matches = message.guild.channels.cache.filter(entry => entry.name.toLowerCase() === name);
    if (matches.size === 1) return matches.first();
    return null;
}

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

async function roleAdd(message, args) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const role = resolveRole(message, args[0]);
    if (!role) return warn(message, `No role named \`${args[0] || ''}\` found`);
    if (first('SELECT * FROM lockdown_role WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id)) {
        return warn(message, `Role ${role} is already in the lockdown role list`);
    }
    run('INSERT INTO lockdown_role (guild_id, role_id) VALUES (?, ?)', message.guild.id, role.id);
    return approve(message, `Role ${role} has been added to the lockdown role list`);
}

async function roleRemove(message, args) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const value = args[0];
    if (!value) return warn(message, 'Usage: `lockdown role remove <role>`');
    const id = String(value).replace(/[<@&>]/g, '');
    const label = roleName(message.guild, id);
    if (!first('SELECT * FROM lockdown_role WHERE guild_id = ? AND role_id = ?', message.guild.id, id)) {
        return warn(message, `Role ${label} is not in the lockdown role list`);
    }
    run('DELETE FROM lockdown_role WHERE guild_id = ? AND role_id = ?', message.guild.id, id);
    return approve(message, `Role ${label} has been removed from the lockdown role list`);
}

async function roleList(message) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const rows = query('SELECT role_id FROM lockdown_role WHERE guild_id = ?', message.guild.id);
    const roles = rows.map(row => roleName(message.guild, row.role_id));
    if (!roles.length) return warn(message, 'No roles in the lockdown role list');
    return paginate(message, roles, 'Lockdown Roles', guildAuthor(message));
}

async function channelAdd(message, args) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const channel = resolveChannel(message, args[0]);
    if (!channel) return warn(message, `No channel named \`${args[0] || ''}\` found`);
    if (first('SELECT * FROM lockdown_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
        return warn(message, `Channel ${channel} is already in the lockdown channel list`);
    }
    run('INSERT INTO lockdown_channel (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
    return approve(message, `Channel ${channel} has been added to the lockdown channel list`);
}

async function channelRemove(message, args) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const value = args[0];
    if (!value) return warn(message, 'Usage: `lockdown channel remove <channel>`');
    const id = String(value).replace(/[<#>]/g, '');
    const label = channelName(message.guild, id);
    if (!first('SELECT * FROM lockdown_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, id)) {
        return warn(message, `Channel ${label} is not in the lockdown channel list`);
    }
    run('DELETE FROM lockdown_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, id);
    return approve(message, `Channel ${label} has been removed from the lockdown channel list`);
}

async function channelList(message) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const rows = query('SELECT channel_id FROM lockdown_channel WHERE guild_id = ?', message.guild.id);
    const channels = rows.map(row => channelName(message.guild, row.channel_id));
    if (!channels.length) return warn(message, 'No channels in the lockdown channel list');
    return paginate(message, channels, 'Lockdown Channels', guildAuthor(message));
}

const roleGroup = {
    data: { name: 'lockdown role', description: 'Manage lockdown role settings', usage: ',lockdown role <add|remove|list>' },
    subcommands: ['add', 'list', 'remove'],
    subUsages: {
        add: ',lockdown role add <role>',
        remove: ',lockdown role remove <role>'
    },
    subs: {
        add: { execute: roleAdd },
        remove: { execute: roleRemove },
        list: { execute: roleList }
    },
    execute: (message, args, client) => sendCard(message, roleGroup)
};

const channelGroup = {
    data: { name: 'lockdown channel', description: 'Manage lockdown channel settings', usage: ',lockdown channel <add|remove|list>' },
    subcommands: ['add', 'list', 'remove'],
    subUsages: {
        add: ',lockdown channel add <channel>',
        remove: ',lockdown channel remove <channel>'
    },
    subs: {
        add: { execute: channelAdd },
        remove: { execute: channelRemove },
        list: { execute: channelList }
    },
    execute: (message, args, client) => sendCard(message, channelGroup)
};

module.exports = {
    data: { name: 'lockdown', description: 'Manage lockdown settings', usage: ',lockdown <role|channel>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['channel', 'role'],
    subs: {
        role: roleGroup,
        channel: channelGroup
    },
    execute: (message, args, client) => sendCard(message, module.exports)
};

applyDescriptions(module.exports, {
    "lockdown role": "Manage lockdown role settings",
    "lockdown role list": "List all roles in the lockdown role list",
    "lockdown role remove": "Remove a role from the lockdown role list",
    "lockdown role add": "Add a role to the lockdown role list",
    "lockdown channel": "Manage lockdown channel settings",
    "lockdown channel list": "List all channels in the lockdown channel list",
    "lockdown channel remove": "Remove a channel from the lockdown channel list",
    "lockdown channel add": "Add a channel to the lockdown channel list"
});
