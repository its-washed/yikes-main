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
    data: { name: 'textonly', description: 'Let no bot commands working in channels', usage: ',textonly <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',textonly add #general',
        remove: ',textonly remove #general',
        list: ',textonly list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'textonly add', description: 'Add a text only channel', usage: ',textonly add #general' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,textonly add #general`');
                if (first('SELECT 1 AS ok FROM only_text WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **already** a text only channel`);
                }
                run('INSERT INTO only_text (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `${channel} is now a **text only** channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'textonly remove', description: 'Remove a text only channel', usage: ',textonly remove #general' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,textonly remove #general`');
                if (!first('SELECT 1 AS ok FROM only_text WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **not** a text only channel`);
                }
                run('DELETE FROM only_text WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `${channel} is no longer a **text only** channel`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'textonly list', description: 'Returns a list of all text only channels', usage: ',textonly list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const results = query('SELECT * FROM only_text WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** text only channels');
                const entries = results.map((result) => `<#${result.channel_id}>`);
                return paginate(message, entries, 'Text Only Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
