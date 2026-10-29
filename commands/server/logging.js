const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

const TYPES = ['messages', 'guild', 'roles', 'channels', 'members', 'moderation', 'voice'];
const IGNORE_COLUMNS = ['ignored_users', 'ignored_roles', 'ignored_channels'];

function parseList(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (err) {
        return [];
    }
}

function iconOf(guild) {
    return guild.icon ? guild.iconURL({ size: 256 }) : undefined;
}

function columnOf(message, token) {
    const raw = String(token || '');
    if (!raw) return null;
    if (message.mentions.users.first()) return { column: 'ignored_users', clean: 'user', id: message.mentions.users.first().id };
    if (message.mentions.roles.first()) return { column: 'ignored_roles', clean: 'role', id: message.mentions.roles.first().id };
    const channel = message.mentions.channels.first();
    if (channel) return { column: 'ignored_channels', clean: 'channel', id: channel.id };
    const cleaned = raw.replace(/[<@!&#>]/g, '');
    if (/^\d+$/.test(cleaned)) {
        if (message.guild.channels.cache.has(cleaned)) return { column: 'ignored_channels', clean: 'channel', id: cleaned };
        if (message.guild.roles.cache.has(cleaned)) return { column: 'ignored_roles', clean: 'role', id: cleaned };
        return { column: 'ignored_users', clean: 'user', id: cleaned };
    }
    return null;
}

async function updateIgnoreList(message, column, clean, id, add) {
    const row = first(`SELECT ${column} FROM logging WHERE guild_id = ?`, message.guild.id);
    const current = row ? parseList(row[column]) : [];
    if (add) {
        if (current.includes(String(id))) return warn(message, `This ${clean} is already in the logging ignore list`);
        current.push(String(id));
    } else {
        if (!current.includes(String(id))) return warn(message, `This ${clean} is not in the logging ignore list`);
        current.splice(current.indexOf(String(id)), 1);
    }
    run(`UPDATE logging SET ${column} = ? WHERE guild_id = ?`, JSON.stringify(current), message.guild.id);
    return approve(message, `${add ? 'Added' : 'Removed'} ${clean} <@${id}> to the logging ignore list`);
}

async function addLogging(message, column, channel) {
    run(`INSERT INTO logging (guild_id, ${column}) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET ${column} = ?`,
        message.guild.id, channel.id, channel.id);
    return approve(message, `Sending **${column.replace(/_/g, ' ')} logs** to ${channel}`);
}

async function removeLogging(message, column) {
    const row = first(`SELECT ${column} FROM logging WHERE guild_id = ?`, message.guild.id);
    if (row && row[column]) {
        run(`UPDATE logging SET ${column} = NULL WHERE guild_id = ?`, message.guild.id);
        return approve(message, `No longer logging **${column.replace(/_/g, ' ')}**`);
    }
    return warn(message, `${column.replace(/_/g, ' ')} logging is **not** enabled.`);
}

function parseChannel(message, token) {
    if (!token) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    return message.guild.channels.cache.get(String(token).replace(/[<#>]/g, '')) || null;
}

function addSub(name, column) {
    return {
        aliases: [],
        data: { name: `logs add ${name}`, description: `Log ${name.replace(/s$/, '')} related events`, usage: `,logs add ${name} <channel>` },
        execute: async (message, args) => {
            if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
            const channel = parseChannel(message, args[0]);
            if (!channel || !channel.isTextBased()) return warn(message, 'Usage: `logs add ' + name + ' <channel>`');
            return addLogging(message, column, channel);
        }
    };
}

function removeSub(name, column) {
    return {
        aliases: [],
        data: { name: `logs remove ${name}`, description: `Stop logging ${name.replace(/s$/, '')} related events`, usage: `,logs remove ${name}` },
        execute: async (message) => {
            if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
            return removeLogging(message, column);
        }
    };
}

module.exports = {
    data: { name: 'logs', description: 'Log events in your server', usage: ',logs <list|add|remove|ignore|setup>' },
    aliases: ['logging'],
    cooldown: 5,
    subcommands: ['list', 'add', 'remove', 'ignore', 'setup'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: list, add, remove, ignore, setup');
        return sendCard(message, module.exports);
    },
    subs: {
        list: {
            aliases: [],
            data: { name: 'logs list', description: 'List all the logging channels', usage: ',logs list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const record = first('SELECT * FROM logging WHERE guild_id = ?', message.guild.id);
                if (!record) return warn(message, 'No logging channels are set.');
                const embed = createEmbed({ color: COLORS.NEUTRAL, title: 'Logging Channels', timestamp: false });
                embed.setAuthor({ name: message.guild.name, iconURL: iconOf(message.guild) });
                let found = 0;
                for (const [key, value] of Object.entries(record)) {
                    if (key === 'guild_id' || key.startsWith('ignored_') || !value) continue;
                    const channel = message.guild.channels.cache.get(String(value));
                    if (!channel) continue;
                    embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: channel.toString(), inline: true });
                    found++;
                }
                if (!found) return warn(message, 'No logging channels are set.');
                return message.reply({ embeds: [embed] });
            }
        },
        add: {
            aliases: [],
            data: { name: 'logs add', description: 'Add logging for specific events', usage: ',logs add <type> <channel>' },
            subcommands: TYPES,
            execute: async (message) => sendCard(message, module.exports.subs.add),
            subs: {
                messages: addSub('messages', 'messages'),
                guild: addSub('guild', 'guild'),
                roles: addSub('roles', 'roles'),
                channels: addSub('channels', 'channels'),
                members: addSub('members', 'members'),
                moderation: addSub('moderation', 'moderation'),
                voice: addSub('voice', 'voice')
            }
        },
        remove: {
            aliases: [],
            data: { name: 'logs remove', description: 'Remove logging for specific events', usage: ',logs remove <type>' },
            subcommands: TYPES,
            execute: async (message) => sendCard(message, module.exports.subs.remove),
            subs: {
                messages: removeSub('messages', 'messages'),
                guild: removeSub('guild', 'guild'),
                roles: removeSub('roles', 'roles'),
                channels: removeSub('channels', 'channels'),
                members: removeSub('members', 'members'),
                moderation: removeSub('moderation', 'moderation'),
                voice: removeSub('voice', 'voice')
            }
        },
        ignore: {
            aliases: [],
            data: { name: 'logs ignore', description: 'Manage the logging ignore list', usage: ',logs ignore <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.ignore);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'logs ignore add', description: 'Add a user, role or channel to the logging ignore list', usage: ',logs ignore add <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = columnOf(message, args[0]);
                        if (!target) return warn(message, 'Usage: `logs ignore add <user|role|channel>`');
                        return updateIgnoreList(message, target.column, target.clean, target.id, true);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'logs ignore remove', description: 'Remove a user, role or channel from the logging ignore list', usage: ',logs ignore remove <target>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = columnOf(message, args[0]);
                        if (!target) return warn(message, 'Usage: `logs ignore remove <user|role|channel>`');
                        return updateIgnoreList(message, target.column, target.clean, target.id, false);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'logs ignore list', description: 'View the logging ignore list', usage: ',logs ignore list' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const row = first('SELECT * FROM logging WHERE guild_id = ?', message.guild.id);
                        const content = [];
                        if (row) {
                            for (const column of IGNORE_COLUMNS) {
                                const entries = parseList(row[column]);
                                if (column === 'ignored_users') content.push(...entries.map(id => `<@${id}>`));
                                else if (column === 'ignored_roles') content.push(...entries.map(id => `<@&${id}>`));
                                else content.push(...entries.map(id => `<#${id}>`));
                            }
                        }
                        if (!content.length) return warn(message, 'No users, roles, or channels are ignored for logging');
                        return paginate(message, content, 'Logging Blacklisted', { name: message.guild.name, icon_url: iconOf(message.guild) });
                    }
                }
            }
        },
        setup: {
            aliases: [],
            data: { name: 'logs setup', description: 'Set up all logging channels in a category', usage: ',logs setup' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const guild = message.guild;
                let category = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === 'Logging Channels');
                if (!category) {
                    category = await guild.channels.create({ name: 'Logging Channels', type: ChannelType.GuildCategory }).catch(() => null);
                }
                if (!category) return warn(message, "I don't have the required permissions to create channels in this category");
                const record = first('SELECT * FROM logging WHERE guild_id = ?', guild.id) || {};
                const embed = createEmbed({ color: COLORS.NEUTRAL, title: 'Logging Setup', timestamp: false });
                embed.setAuthor({ name: guild.name, iconURL: iconOf(guild) });
                try {
                    for (const type of TYPES) {
                        if (record[type]) {
                            const channel = guild.channels.cache.get(String(record[type]));
                            if (channel) embed.addFields({ name: `${type.charAt(0).toUpperCase() + type.slice(1)} Logging`, value: channel.toString(), inline: true });
                            continue;
                        }
                        const channel = await guild.channels.create({
                            name: `${type}-logs`,
                            type: ChannelType.GuildText,
                            parent: category.id,
                            permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
                        });
                        run(`INSERT INTO logging (guild_id, ${type}) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET ${type} = ?`,
                            guild.id, channel.id, channel.id);
                        embed.addFields({ name: `${type.charAt(0).toUpperCase() + type.slice(1)} Logging`, value: channel.toString(), inline: true });
                    }
                    return message.reply({ embeds: [embed] });
                } catch (err) {
                    return warn(message, "I don't have the required permissions to create channels in this category");
                }
            }
        }
    }
};
