const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { first, run } = require('../../utils/database');

module.exports = {
    data: { name: 'safemode', description: 'Toggle the safemode on or off', usage: ',safemode on', params: ['mode'] },
    aliases: ['safesearch'],
    cooldown: 3,

    async execute(message, args) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        const mode = String(args[0] || '').toLowerCase();
        if (!['on', 'off'].includes(mode)) return warn(message, 'Invalid mode, please use either **on** or **off**');
        const value = mode === 'on' ? 1 : 0;
        const row = first('SELECT guild_id FROM safemode WHERE guild_id = ?', message.guild.id);
        if (row) {
            run('UPDATE safemode SET safemode = ? WHERE guild_id = ?', value, message.guild.id);
        } else {
            run('INSERT INTO safemode (guild_id, safemode) VALUES (?, ?)', message.guild.id, value);
        }
        return approve(message, mode === 'on' ? 'Safe mode is now **on**' : 'Safe mode is now **off**');
    }
};
