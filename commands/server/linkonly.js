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
    data: { name: 'linkonly', description: 'Let members only send links in channels', usage: ',linkonly <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',linkonly add #links',
        remove: ',linkonly remove #links',
        list: ',linkonly list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'linkonly add', description: 'Add a link only channel', usage: ',linkonly add #links' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,linkonly add #links`');
                if (first('SELECT 1 AS ok FROM only_link WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **already** a link only channel`);
                }
                run('INSERT INTO only_link (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `${channel} is now a **link only** channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'linkonly remove', description: 'Remove a link only channel', usage: ',linkonly remove #links' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,linkonly remove #links`');
                if (!first('SELECT 1 AS ok FROM only_link WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **not** a link only channel`);
                }
                run('DELETE FROM only_link WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `${channel} is no longer a **link only** channel`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'linkonly list', description: 'Returns a list of all link only channels', usage: ',linkonly list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const results = query('SELECT * FROM only_link WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** link only channels');
                const entries = results.map((result) => `<#${result.channel_id}>`);
                return paginate(message, entries, 'Link Only Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
