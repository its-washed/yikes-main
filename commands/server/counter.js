const { PermissionFlagsBits, GuildChannelType } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

const CHANNEL_TYPES = ['voice', 'stage', 'text', 'category'];

async function createCounterChannel(message, chanMessage, replaceWith, channeltype) {
    const guild = message.guild;
    const name = chanMessage.replace('{target}', replaceWith);
    const reason = 'creating member counter';
    if (channeltype === 'stage') {
        return guild.channels.create({ name, type: GuildChannelType.Stage, reason, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }] });
    }
    if (channeltype === 'voice') {
        return guild.channels.create({ name, type: GuildChannelType.Voice, reason, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }] });
    }
    if (channeltype === 'category') {
        return guild.channels.create({ name, type: GuildChannelType.Category, reason });
    }
    return guild.channels.create({ name, type: GuildChannelType.GuildText, reason, permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }] });
}

async function addCounter(message, args, client, moduleName, valueFn) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
    const channeltype = args[0];
    if (!CHANNEL_TYPES.includes(channeltype)) return warn(message, 'Usage: `counter add ' + moduleName + ' <voice|stage|text|category> [message]`');
    const roleToken = moduleName === 'role' ? args[1] : null;
    const chanMessage = (moduleName === 'role' ? args.slice(2) : args.slice(1)).join(' ').trim() || '{target}';
    const check = roleToken
        ? first('SELECT * FROM counters WHERE guild_id = ? AND module = ? AND role_id = ?', message.guild.id, moduleName, String(roleToken).replace(/[<@&>]/g, ''))
        : first('SELECT * FROM counters WHERE guild_id = ? AND module = ?', message.guild.id, moduleName);
    if (check) {
        return warn(message, `<#${check.channel_id}> is already a **${moduleName === 'role' ? 'role' : moduleName}** counter`);
    }
    try {
        const channel = await createCounterChannel(message, chanMessage, String(valueFn()), channeltype);
        if (roleToken) {
            const roleId = String(roleToken).replace(/[<@&>]/g, '');
            run('INSERT INTO counters (guild_id, channeltype, channel_id, message, module, role_id) VALUES (?, ?, ?, ?, ?, ?)',
                message.guild.id, channeltype, channel.id, chanMessage, moduleName, roleId);
            return approve(message, `Created **role** counter for <@&${roleId}> -> ${channel.toString()}`);
        }
        run('INSERT INTO counters (guild_id, channeltype, channel_id, message, module) VALUES (?, ?, ?, ?, ?)',
            message.guild.id, channeltype, channel.id, chanMessage, moduleName);
        return approve(message, `Created **${moduleName}** counter -> ${channel.toString()}`);
    } catch (err) {
        return warn(message, `Failed to create the counter channel\n \`\`\`${err.message}\`\`\``);
    }
}

module.exports = {
    data: { name: 'counter', description: 'Create counters for everybody to see', usage: ',counter <types|add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['types', 'add', 'remove', 'list'],
    subUsages: {
        types: ',counter types',
        add: ',counter add <members|humans|bots|voice|boosters|boosts|role> <channeltype> [message]',
        remove: ',counter remove <type> [role]',
        list: ',counter list'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        types: {
            aliases: [],
            data: { name: 'counter types', description: 'Returns the counter types and channel types', usage: ',counter types' },
            execute: async (message) => {
                return message.reply({
                    embeds: [
                        {
                            color: 0x729BB0,
                            title: 'counter types',
                            description: '>>> members - all members from the server (including bots)\nhumans - all members from the server (excluding bots)\nbots - all bots from the server\nboosters - all server boosters\nvoice - all members in a voice channel\nrole - all members in a certain role\nboosts - all boosts from the server'
                        },
                        {
                            color: 0x729BB0,
                            title: 'channel types',
                            description: '>>> voice - creates voice channel\nstage - creates stage channel\ntext - creates text channel\ncategory - creates category channel'
                        }
                    ]
                });
            }
        },
        add: {
            aliases: [],
            data: { name: 'counter add', description: 'Create channel counter', usage: ',counter add <type> <channeltype> [message]' },
            subcommands: ['members', 'humans', 'bots', 'voice', 'boosters', 'boosts', 'role'],
            subUsages: {
                members: ',counter add members <channeltype> [message]',
                humans: ',counter add humans <channeltype> [message]',
                bots: ',counter add bots <channeltype> [message]',
                voice: ',counter add voice <channeltype> [message]',
                boosters: ',counter add boosters <channeltype> [message]',
                boosts: ',counter add boosts <channeltype> [message]',
                role: ',counter add role <channeltype> @role [message]'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.add);
            },
            subs: {
                members: {
                    aliases: [],
                    data: { name: 'counter add members', description: 'Add a counter for the member count', usage: ',counter add members <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'members', () => message.guild.memberCount)
                },
                humans: {
                    aliases: [],
                    data: { name: 'counter add humans', description: 'Add a counter for non bots members', usage: ',counter add humans <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'humans', () => message.guild.members.cache.filter(m => !m.bot).size)
                },
                bots: {
                    aliases: [],
                    data: { name: 'counter add bots', description: 'Add a counter for bots', usage: ',counter add bots <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'bots', () => message.guild.members.cache.filter(m => m.bot).size)
                },
                voice: {
                    aliases: [],
                    data: { name: 'counter add voice', description: 'Add a counter for members that are connected to a voice channel', usage: ',counter add voice <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'voice', () => message.guild.channels.cache.filter(c => c.type === GuildChannelType.GuildVoice).reduce((sum, c) => sum + c.members.size, 0))
                },
                boosters: {
                    aliases: [],
                    data: { name: 'counter add boosters', description: 'Add a counter for boosters', usage: ',counter add boosters <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'boosters', () => message.guild.members.cache.filter(m => m.premiumSince).size)
                },
                boosts: {
                    aliases: [],
                    data: { name: 'counter add boosts', description: 'Add a counter for boosts', usage: ',counter add boosts <channeltype> [message]' },
                    execute: async (message, args, client) => addCounter(message, args, client, 'boosts', () => message.guild.premiumSubscriptionCount || 0)
                },
                role: {
                    aliases: [],
                    data: { name: 'counter add role', description: 'Add a counter for a specific role', usage: ',counter add role <channeltype> @role [message]' },
                    execute: async (message, args, client) => {
                        const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args[1] || '').replace(/[<@&>]/g, ''));
                        if (!role) return warn(message, 'Usage: `counter add role <channeltype> @role [message]`');
                        return addCounter(message, [args[0], role.toString(), ...args.slice(2)], client, 'role', () => role.members.size);
                    }
                }
            }
        },
        remove: {
            aliases: [],
            data: { name: 'counter remove', description: 'Remove a counter from the server', usage: ',counter remove <type> [role]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const countertype = args[0];
                const valid = ['members', 'humans', 'bots', 'voice', 'boosters', 'boosts', 'role'];
                if (!valid.includes(countertype)) return warn(message, 'Usage: `counter remove <members|humans|bots|voice|boosters|boosts|role> [role]`');
                if (countertype === 'role') {
                    const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args[1] || '').replace(/[<@&>]/g, ''));
                    if (!role) return warn(message, 'Usage: `counter remove role @role`');
                    const check = first('SELECT * FROM counters WHERE guild_id = ? AND module = ? AND role_id = ?', message.guild.id, 'role', role.id);
                    if (!check) return warn(message, `There is no **role** counter for ${role.toString()} in this server`);
                    const channel = message.guild.channels.cache.get(String(check.channel_id));
                    if (channel) await channel.delete().catch(() => {});
                    run('DELETE FROM counters WHERE guild_id = ? AND module = ? AND role_id = ?', message.guild.id, 'role', role.id);
                    return approve(message, `Removed **role** counter for ${role.toString()}`);
                }
                const check = first('SELECT * FROM counters WHERE guild_id = ? AND module = ?', message.guild.id, countertype);
                if (!check) return warn(message, `There is no **${countertype}** counter in this server`);
                const channel = message.guild.channels.cache.get(String(check.channel_id));
                if (channel) await channel.delete().catch(() => {});
                run('DELETE FROM counters WHERE guild_id = ? AND module = ?', message.guild.id, countertype);
                return approve(message, `Removed **${countertype}** counter`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'counter list', description: 'Returns a list of the active server counters', usage: ',counter list' },
            execute: async (message) => {
                const results = query('SELECT * FROM counters WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no counters');
                const lines = results.map(r => {
                    const channel = message.guild.channels.cache.get(String(r.channel_id));
                    return `${r.module} -> ${channel ? channel.toString() : r.channel_id}`;
                });
                return paginate(message, lines, 'Counters',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        }
    }
};
