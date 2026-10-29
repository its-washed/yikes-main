const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

function resolveMember(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.members.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return null;
}

function resolveChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase()) || null;
}

function resolveThread(message, value) {
    const channel = resolveChannel(message, value);
    if (channel && channel.isThread()) return channel;
    return null;
}

function threadOrCurrent(message, value) {
    return resolveThread(message, value) || message.channel;
}

function parseMessageLink(text) {
    const match = String(text || '').match(/https?:\/\/(?:www\.)?discord\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})/);
    if (!match) return null;
    return { channelId: match[1], messageId: match[3] };
}

async function needThreadPerm(message) {
    if (!await needPerm(message, PermissionFlagsBits.ManageThreads)) return false;
    if (!await needBotPerm(message, PermissionFlagsBits.ManageThreads)) return false;
    return true;
}

async function lockThread(message, value) {
    const thread = threadOrCurrent(message, value);
    if (!thread.isThread()) return warn(message, `${thread} is not a thread`);
    if (thread.locked) return warn(message, `${thread} is already locked`);
    await thread.edit({ locked: true, reason: `Locked by ${message.author} (${message.author.id})` }).catch(() => {
        warn(message, `I couldn't lock ${thread}`);
        return null;
    });
    await approve(message, `Successfully **locked** ${thread}`);
    await message.delete().catch(() => {});
}

module.exports = {
    permission: "manage threads",
    data: { name: 'thread', description: 'Manage threads', usage: ',thread <lock|unlock|create|delete|add|remove|watch|auto>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['lock', 'unlock', 'create', 'delete', 'add', 'remove', 'watch', 'auto'],
    subUsages: {
        lock: ',thread lock [#thread]',
        unlock: ',thread unlock [#thread]',
        create: ',thread create <message link> <name>',
        delete: ',thread delete [#thread]',
        add: ',thread add <member>',
        remove: ',thread remove <member>',
        watch: ',thread watch <on|off>',
        auto: ',thread auto <add|remove|list>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        lock: {
            aliases: [],
            data: { name: 'thread lock', description: 'Lock a thread', usage: ',thread lock [#thread]' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                return lockThread(message, args.join(' '));
            }
        },

        unlock: {
            aliases: [],
            data: { name: 'thread unlock', description: 'Unlock a locked thread', usage: ',thread unlock [#thread]' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const thread = threadOrCurrent(message, args.join(' '));
                if (!thread.isThread()) return warn(message, `${thread} is not a thread`);
                if (!thread.locked) return warn(message, `${thread} is **not** locked`);
                await thread.edit({ locked: false, reason: `Unlocked by ${message.author} (${message.author.id})` }).catch(() => {
                    warn(message, `I couldn't unlock ${thread}`);
                    return null;
                });
                return approve(message, `Successfully **unlocked** ${thread}`);
            }
        },

        create: {
            aliases: [],
            data: { name: 'thread create', description: "Create a thread in a channel", usage: ',thread create <message link> <name>' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const link = parseMessageLink(args[0]);
                if (!link) return warn(message, 'You must provide a valid message link\n> Usage: `thread create <message link> <name>`');
                const name = args.slice(1).join(' ').trim();
                if (!name) return warn(message, 'You must provide a name for the thread\n> Usage: `thread create <message link> <name>`');
                let target = null;
                try {
                    const channel = await message.client.channels.fetch(link.channelId);
                    if (channel && channel.messages) target = await channel.messages.fetch(link.messageId);
                } catch (err) {
                    target = null;
                }
                if (!target) return warn(message, `Couldn't create a thread in <#${link.channelId}>`);
                const thread = await target.createThread({ name }).catch(() => null);
                if (!thread) return warn(message, `Couldn't create a thread in <#${link.channelId}>`);
                return approve(message, `Created ${thread}`);
            }
        },

        delete: {
            aliases: ['del', 'remove-channel'],
            data: { name: 'thread delete', description: 'Delete a thread', usage: ',thread delete [#thread]' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const thread = threadOrCurrent(message, args.join(' '));
                if (!thread.isThread()) return warn(message, `${thread} is not a thread`);
                await thread.delete(`Deleted by ${message.author} (${message.author.id})`).catch(() => {
                    warn(message, `I couldn't delete ${thread}`);
                    return null;
                });
                return approve(message, `Deleted ${thread}`);
            }
        },

        add: {
            aliases: [],
            data: { name: 'thread add', description: 'Add a member to a thread', usage: ',thread add <member>' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const thread = message.channel;
                if (!thread.isThread()) return warn(message, `${thread} is not a thread`);
                if (thread.archived) return warn(message, `${thread} is archived. Unarchive it to add members.`);
                if (thread.locked) return warn(message, `${thread} is locked. Unlock it to add members.`);
                const member = resolveMember(message, args[0]);
                if (!member) return warn(message, `Member **${args[0] || ''}** couldn't be found`);
                const existing = await thread.members.fetch(member.id).catch(() => null);
                if (existing) return warn(message, `${member} is already in ${thread}`);
                const granted = await thread.members.add(member).catch(() => null);
                if (!granted) return warn(message, `Missing permissions to add ${member} to ${thread}`);
                return approve(message, `Added ${member} to ${thread}`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'thread remove', description: 'Remove a member from a thread', usage: ',thread remove <member>' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const thread = message.channel;
                if (!thread.isThread()) return warn(message, `${thread} is not a thread`);
                const member = resolveMember(message, args[0]);
                if (!member) return warn(message, `Member **${args[0] || ''}** couldn't be found`);
                if (member.id === message.author.id) return warn(message, "You can't remove yourself from a thread");
                const existing = await thread.members.fetch(member.id).catch(() => null);
                if (!existing) return warn(message, `${member} is not in ${thread}`);
                const removed = await thread.members.remove(member).catch(() => null);
                if (!removed) return warn(message, `Missing permissions to remove ${member} from ${thread}`);
                return approve(message, `Removed ${member} from ${thread}`);
            }
        },

        watch: {
            aliases: [],
            data: { name: 'thread watch', description: "Watch a thread", usage: ',thread watch <on|off>' },
            async execute(message, args, client, config) {
                if (!await needThreadPerm(message)) return;
                const mode = String(args[0] || '').toLowerCase();
                if (mode !== 'on' && mode !== 'off') return warn(message, 'Invalid mode. Choose from `on` or `off`');
                run('INSERT OR REPLACE INTO thread_watcher (guild_id, state) VALUES (?, ?)', message.guild.id, mode === 'on' ? 1 : 0);
                if (mode === 'on') return approve(message, 'Threads in this server will be watched');
                return approve(message, 'Threads in this server will **not** be watched');
            }
        },

        auto: {
            aliases: [],
            data: { name: 'thread auto', description: 'Manage auto-thread settings', usage: ',thread auto <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: ',thread auto add #selfies',
                remove: ',thread auto remove #selfies',
                list: ',thread auto list'
            },
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.auto);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'thread auto add', description: 'Add a channel to auto-thread', usage: ',thread auto add #selfies' },
                    async execute(message, args, client, config) {
                        if (!await needThreadPerm(message)) return;
                        const channel = resolveChannel(message, args.join(' '));
                        if (!channel) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);
                        const existing = first('SELECT 1 AS ok FROM autothread WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        if (existing) return warn(message, `${channel} is already in auto-thread`);
                        run('INSERT INTO autothread (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                        return approve(message, `Added ${channel} to auto-thread`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'thread auto remove', description: 'Remove a channel from auto-thread', usage: ',thread auto remove #selfies' },
                    async execute(message, args, client, config) {
                        if (!await needThreadPerm(message)) return;
                        const channel = resolveChannel(message, args.join(' '));
                        if (!channel) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);
                        const existing = first('SELECT 1 AS ok FROM autothread WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        if (!existing) return warn(message, `${channel} is not in auto-thread`);
                        run('DELETE FROM autothread WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        return approve(message, `Removed ${channel} from auto-thread`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'thread auto list', description: 'List all auto-thread channels', usage: ',thread auto list' },
                    async execute(message, args, client, config) {
                        if (!await needThreadPerm(message)) return;
                        const rows = query('SELECT channel_id FROM autothread WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'There are no auto-thread channels');
                        const { paginate } = require('../../utils/context');
                        const lines = rows.map(row => {
                            const channel = message.guild.channels.cache.get(String(row.channel_id));
                            return channel ? `${channel}` : `<#${row.channel_id}>`;
                        });
                        return paginate(message, lines, 'Auto-Thread Channels', {
                            name: message.guild.name,
                            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                        });
                    }
                }
            }
        }
    },

    lockThread
};
