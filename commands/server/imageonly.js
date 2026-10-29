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
    data: { name: 'imageonly', description: 'Let members only send images in channels', usage: ',imageonly <add|remove|list>' },
    aliases: ['imgonly', 'gallery'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',imageonly add #general',
        remove: ',imageonly remove #general',
        list: ',imageonly list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'imageonly add', description: 'Add an image only channel', usage: ',imageonly add #general' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,imageonly add #general`');
                if (first('SELECT 1 AS ok FROM only_img WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **already** an image only channel`);
                }
                run('INSERT INTO only_img (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `${channel} is now an **image only** channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'imageonly remove', description: 'Remove an image only channel', usage: ',imageonly remove #general' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,imageonly remove #general`');
                if (!first('SELECT 1 AS ok FROM only_img WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `${channel} is **not** an image only channel`);
                }
                run('DELETE FROM only_img WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `${channel} is no longer an **image only** channel`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'imageonly list', description: 'Returns a list of all image only channels', usage: ',imageonly list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const results = query('SELECT * FROM only_img WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are **no** image only channels');
                const entries = results.map((result) => `<#${result.channel_id}>`);
                return paginate(message, entries, 'Image Only Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
