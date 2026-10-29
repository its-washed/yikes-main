const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { eventGroup, templateOf } = require('../../utils/eventMessages');
const { parseChannel } = require('../../utils/helpers');

const subs = eventGroup('welcome', 'welcome', { deleteGroup: true });

subs.joinping = {
    aliases: [],
    data: { name: 'welcome joinping', description: 'Add a join ping in a specific channel', usage: ',welcome joinping <channel>' },
    execute: async (message, args) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const channel = parseChannel(message, args[0]);
        if (!channel) return warn(message, 'Usage: `welcome joinping <channel>`');
        const rows = query('SELECT * FROM welcome WHERE guild_id = ?', message.guild.id);
        if (rows.length >= 10) return warn(message, 'You can only have **10 welcome messages** per server.');
        const code = '{embed}$v{content: {user.mention}}$v{delete: 1}';
        const check = first('SELECT * FROM welcome WHERE channel_id = ?', channel.id);
        if (check) run('UPDATE welcome SET message = ? WHERE channel_id = ?', code, channel.id);
        else run('INSERT INTO welcome (guild_id, channel_id, message) VALUES (?, ?, ?)', message.guild.id, channel.id, code);
        return approve(message, `Added join ping message to ${channel}`);
    }
};

module.exports = {
    data: { name: 'welcome', description: 'Set up a welcome message in one or multiple channels', usage: ',welcome <add|joinping|remove|list|delete|test|reset>' },
    aliases: ['greet', 'wlc', 'welc'],
    cooldown: 5,
    subcommands: ['add', 'joinping', 'remove', 'list', 'delete', 'test', 'reset'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, joinping, remove, list, delete, test, reset');
        return sendCard(message, module.exports);
    },
    subs
};
