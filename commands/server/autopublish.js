const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
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
    data: { name: 'autopublish', description: 'Manage autopublish channels', usage: ',autopublish <add|remove|list>' },
    aliases: ['ap'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',autopublish add #updates',
        remove: ',autopublish remove #updates',
        list: ',autopublish list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'autopublish add', description: 'Add a channel to autopublish', usage: ',autopublish add #updates' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,autopublish add #updates`');
                if (channel.type !== ChannelType.GuildAnnouncement) {
                    return warn(message, `Channel ${channel} is not an announcement channel`);
                }
                if (first('SELECT channel_id FROM autopublish WHERE channel_id = ?', channel.id)) {
                    return warn(message, `Channel ${channel} already exist for autopublish`);
                }
                run('INSERT INTO autopublish (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `Added ${channel} as autopublish channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'autopublish remove', description: 'Remove a channel from autopublish', usage: ',autopublish remove #updates' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,autopublish remove #updates`');
                if (!first('SELECT channel_id FROM autopublish WHERE channel_id = ?', channel.id)) {
                    return warn(message, `Channel ${channel} not exist for autopublish`);
                }
                run('DELETE FROM autopublish WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `Removed ${channel} as autopublsh channel`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'autopublish list', description: 'List all autopublish channels', usage: ',autopublish list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const results = query('SELECT channel_id FROM autopublish WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no autopublish channels set');
                const entries = results.map((result) =>
                    message.guild.channels.cache.get(result.channel_id)
                        ? `<#${result.channel_id}>` : String(result.channel_id));
                return paginate(message, entries, 'Autopublish Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
