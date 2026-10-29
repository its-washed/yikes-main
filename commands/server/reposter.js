const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run } = require('../../utils/database');

function ensureRow(guildId) {
    if (!first('SELECT guild_id FROM reposter WHERE guild_id = ?', guildId)) {
        run('INSERT INTO reposter (guild_id) VALUES (?)', guildId);
    }
}

function toggle(message, column, option, label) {
    const option2 = String(option || '').toLowerCase();
    if (!['on', 'off'].includes(option2)) return warn(message, 'Invalid option. Valid options are: `on` & `off`');
    ensureRow(message.guild.id);
    run(`UPDATE reposter SET "${column}" = ? WHERE guild_id = ?`, option2 === 'on', message.guild.id);
    return approve(message, `${option2 === 'on' ? 'Enabled' : 'Disabled'} ${label} for reposts`);
}

module.exports = {
    data: { name: 'reposter', description: 'Fine tune reposts which can be used in your server', usage: ',reposter <embed|prefix|delete|status|channel>' },
    aliases: ['rp'],
    cooldown: 5,
    subcommands: ['embed', 'prefix', 'delete', 'status', 'channel'],
    subUsages: {
        embed: ',reposter embed on',
        prefix: ',reposter prefix evelina',
        delete: ',reposter delete on',
        status: ',reposter status on',
        channel: ',reposter channel #repost'
    },
    execute: async (message) => sendCard(message, module.exports),

    subs: {
        embed: {
            aliases: [],
            data: { name: 'reposter embed', description: 'Enable or disable embeds for reposts', usage: ',reposter embed on' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return toggle(message, 'embed', args[0], 'embeds');
            }
        },
        prefix: {
            aliases: [],
            data: { name: 'reposter prefix', description: 'Change the prefix for reposts', usage: ',reposter prefix evelina' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const prefix = args.join(' ').trim();
                if (!prefix) return warn(message, 'You must provide a prefix\n> Usage: `,reposter prefix evelina`');
                ensureRow(message.guild.id);
                run('UPDATE reposter SET prefix = ? WHERE guild_id = ?', prefix, message.guild.id);
                return approve(message, `Changed the prefix for reposts to \`${prefix}\``);
            }
        },
        delete: {
            aliases: [],
            data: { name: 'reposter delete', description: 'Enable or disable deletion of trigger messages', usage: ',reposter delete on' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return toggle(message, 'delete', args[0], 'deletion of reposted messages');
            }
        },
        status: {
            aliases: [],
            data: { name: 'reposter status', description: 'Enable or disable reposts in your server', usage: ',reposter status on' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return toggle(message, 'status', args[0], 'status');
            }
        },
        channel: {
            aliases: [],
            data: { name: 'reposter channel', description: 'Add or remove a channel for reposts blacklist', usage: ',reposter channel #repost' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,reposter channel #repost`');
                if (first('SELECT 1 AS ok FROM reposter_channels WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id)) {
                    run('DELETE FROM reposter_channels WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                    return approve(message, `Removed ${channel} from the reposts blacklist`);
                }
                run('INSERT INTO reposter_channels (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `Added ${channel} to the reposts blacklist`);
            }
        }
    }
};
