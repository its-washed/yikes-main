const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

function confessRow(guildId) {
    return first('SELECT * FROM confess WHERE guild_id = ?', guildId);
}

function needEnabled(message) {
    if (!confessRow(message.guild.id)) {
        warn(message, "Confessions aren't **enabled** in this server");
        return false;
    }
    return true;
}

module.exports = {
    data: { name: 'confessions', description: 'Setup the confessions module', usage: ',confessions <enable|disable|channel|mute|unmute|muted>' },
    aliases: ['conf'],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'channel', 'mute', 'unmute', 'muted'],
    subUsages: {
        enable: ',confessions enable #channel',
        disable: ',confessions disable',
        channel: ',confessions channel #channel',
        mute: ',confessions mute <id>',
        unmute: ',confessions unmute <id>',
        muted: ',confessions muted'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            aliases: [],
            data: { name: 'confessions enable', description: 'Enable the confessions module', usage: ',confessions enable #channel' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `confessions enable #channel`');
                const check = confessRow(message.guild.id);
                if (check) run('UPDATE confess SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                else run('INSERT INTO confess (guild_id, channel_id, confession) VALUES (?, ?, 0)', message.guild.id, channel.id);
                return approve(message, `Confession channel set to ${channel.toString()}`);
            }
        },
        disable: {
            aliases: [],
            data: { name: 'confessions disable', description: 'Disable the confessions module', usage: ',confessions disable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT channel_id FROM confess WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, "Confessions aren't **enabled** in this server");
                run('DELETE FROM confess WHERE guild_id = ?', message.guild.id);
                run('DELETE FROM confess_members WHERE guild_id = ?', message.guild.id);
                run('DELETE FROM confess_mute WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Confessions disabled');
            }
        },
        channel: {
            aliases: [],
            data: { name: 'confessions channel', description: 'Set the confession channel', usage: ',confessions channel #channel' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `confessions channel #channel`');
                run('UPDATE confess SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Confession channel set to ${channel.toString()}`);
            }
        },
        mute: {
            aliases: [],
            data: { name: 'confessions mute', description: 'Mute a user from sending confessions', usage: ',confessions mute <id>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const id = parseInt(args[0], 10);
                if (!Number.isFinite(id)) return warn(message, 'Usage: `confessions mute <id>`');
                const confession = first('SELECT * FROM confess_members WHERE guild_id = ? AND confession = ?', message.guild.id, id);
                if (!confession) return warn(message, `Confession **${id}** doesn't exist`);
                const mute = first('SELECT * FROM confess_mute WHERE guild_id = ? AND confession = ?', message.guild.id, id);
                if (mute) return warn(message, `Confession author **#${id}** is already **muted**`);
                run('INSERT INTO confess_mute (guild_id, user_id, confession) VALUES (?, ?, ?)', message.guild.id, confession.user_id, id);
                return approve(message, `Author of confession **#${id}** has been **muted**`);
            }
        },
        unmute: {
            aliases: [],
            data: { name: 'confessions unmute', description: 'Unmute a user from sending confessions', usage: ',confessions unmute <id>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const id = parseInt(args[0], 10);
                if (!Number.isFinite(id)) return warn(message, 'Usage: `confessions unmute <id>`');
                const confession = first('SELECT * FROM confess_members WHERE guild_id = ? AND confession = ?', message.guild.id, id);
                if (!confession) return warn(message, `Confession **${id}** doesn't exist`);
                const mute = first('SELECT * FROM confess_mute WHERE guild_id = ? AND confession = ?', message.guild.id, id);
                if (!mute) return warn(message, `Confession author **#${id}** isn't **muted**`);
                run('DELETE FROM confess_mute WHERE guild_id = ? AND user_id = ? AND confession = ?', message.guild.id, confession.user_id, id);
                return approve(message, `Author of confession **#${id}** has been **unmuted**`);
            }
        },
        muted: {
            aliases: [],
            data: { name: 'confessions muted', description: 'List all confessions muted users', usage: ',confessions muted' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const muted = query('SELECT * FROM confess_mute WHERE guild_id = ?', message.guild.id);
                if (!muted.length) return warn(message, 'There are no **confessions muted** users');
                const lines = muted.map(m => `${m.confession}`);
                return paginate(message, lines, 'Confessions Muted',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        }
    }
};
