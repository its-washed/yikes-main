const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

function resolveChannel(message, args) {
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const raw = String(args.join(' ') || '').trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(raw)) return message.guild.channels.cache.get(raw) || null;
    if (raw) return message.guild.channels.cache.find((c) => c.name === raw) || null;
    return null;
}

module.exports = {
    permission: "manage channels",
    data: { name: 'botonly', description: 'Let only bots send in channels', usage: ',botonly <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',botonly add #commands',
        remove: ',botonly remove #commands',
        list: ',botonly list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'botonly add', description: 'Add an bot only channel', usage: ',botonly add #commands' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,botonly add #commands`');
                if (first('SELECT 1 AS ok FROM only_bot WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **already** an bot only channel`);
                }
                run('INSERT INTO only_bot (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `${channel} is now an **bot only** channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'botonly remove', description: 'Remove an bot only channel', usage: ',botonly remove #commands' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,botonly remove #commands`');
                if (!first('SELECT 1 AS ok FROM only_bot WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **not** an bot only channel`);
                }
                run('DELETE FROM only_bot WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `${channel} is no longer an **bot only** channel`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'botonly list', description: 'Returns a list of all bot only channels', usage: ',botonly list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const results = query('SELECT * FROM only_bot WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** bot only channels');
                const entries = results.map((result) => `<#${result.channel_id}>`);
                return paginate(message, entries, 'Bot Only Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
