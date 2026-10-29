const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { humanizeTime } = require('../../utils/helpers');

function resolveChannel(message, args) {
    const mentioned = message.mentions.channels.first();
    if (mentioned) return { channel: mentioned, rest: args.filter((a) => !String(a).includes(mentioned.id)) };
    const raw = String(args[0] || '').trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(raw)) {
        const channel = message.guild.channels.cache.get(raw);
        if (channel) return { channel, rest: args.slice(1) };
    }
    return { channel: null, rest: args };
}

module.exports = {
    data: { name: 'revive', description: 'Revive a channel', usage: ',revive <add|remove|list>' },
    aliases: ['rv'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',revive add #general 15m @everyone, get active',
        remove: ',revive remove #general',
        list: ',revive list'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'revive add', description: 'Add a channel to revive', usage: ',revive add #general 15m @everyone, get active' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const { channel, rest } = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,revive add #general 15m @everyone, get active`');
                const timeArg = rest.find((a) => /^\d+[smhd]$/.test(String(a)));
                const timeout = timeArg ? parseTime(timeArg) : null;
                if (!timeout) return warn(message, 'You must provide a timeout\n> Usage: `,revive add #general 15m @everyone, get active`');
                const code = rest.filter((a) => a !== timeArg).join(' ').trim();
                if (!code) return warn(message, 'You must provide a message\n> Usage: `,revive add #general 15m @everyone, get active`');
                if (first('SELECT 1 AS ok FROM revive WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    return warn(message, `Channel ${channel} already exist for revive`);
                }
                run('INSERT INTO revive (guild_id, channel_id, timeout, last_message, message) VALUES (?, ?, ?, ?, ?)',
                    message.guild.id, channel.id, timeout, Math.floor(Date.now() / 1000), code);
                return approve(message, `Added ${channel} with a ${humanizeTime(timeout)} timeout for revive`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'revive remove', description: 'Remove a channel from revive', usage: ',revive remove #general' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const { channel } = resolveChannel(message, args);
                const channelId = channel ? channel.id : String(args.join(' ') || '').replace(/[<#>]/g, '');
                if (!/^\d{17,20}$/.test(channelId)) return warn(message, 'You must mention a channel\n> Usage: `,revive remove #general`');
                if (!first('SELECT 1 AS ok FROM revive WHERE guild_id = ? AND channel_id = ?', message.guild.id, channelId)) {
                    return warn(message, `Channel ${channel ? `${channel}` : `<#${channelId}>`} not exist for revive`);
                }
                run('DELETE FROM revive WHERE guild_id = ? AND channel_id = ?', message.guild.id, channelId);
                return approve(message, `Removed ${channel ? `${channel}` : `<#${channelId}>`} from revive`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'revive list', description: 'List all revive channels', usage: ',revive list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const results = query('SELECT channel_id, timeout, last_message FROM revive WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no revive channels set');
                const entries = results.map((result) => {
                    const channel = message.guild.channels.cache.get(String(result.channel_id));
                    const timeout = humanizeTime(Number(result.timeout) || 0);
                    const lastMessage = result.last_message ? `<t:${Math.floor(result.last_message)}:R>` : 'never';
                    return `${channel ? `${channel}` : `<#${result.channel_id}>`} - ${timeout} (${lastMessage})`;
                });
                return paginate(message, entries, 'Revive Channels', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
