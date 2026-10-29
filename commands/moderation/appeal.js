const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

function resolveChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    permission: "manage server",
    data: { name: 'appeal', description: 'Manage appeals', usage: ',appeal <set|remove|list>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['set', 'remove', 'list'],
    subUsages: {
        set: ',appeal set #appeals',
        remove: ',appeal remove',
        list: ',appeal list'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        set: {
            aliases: [],
            data: { name: 'appeal set', description: 'Set the appeals channel', usage: ',appeal set #appeals' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = resolveChannel(message, args.join(' '));
                if (!channel) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);
                const check = first('SELECT 1 AS ok FROM appeals WHERE guild_id = ?', message.guild.id);
                if (check) return warn(message, 'There is already an appeals channel set');
                run('INSERT INTO appeals (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `Set ${channel} as the appeals channel`);
            }
        },

        remove: {
            aliases: ['delete'],
            data: { name: 'appeal remove', description: 'Remove the appeals channel', usage: ',appeal remove' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT 1 AS ok FROM appeals WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'There is no appeals channel set');
                run('DELETE FROM appeals WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Removed the appeals channel');
            }
        },

        list: {
            aliases: [],
            data: { name: 'appeal list', description: 'List the appeals channel', usage: ',appeal list' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT channel_id FROM appeals WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'There is no appeals channel set');
                const channel = message.guild.channels.cache.get(String(check.channel_id));
                return approve(message, `Appeals channel: ${channel ? `${channel}` : `<#${check.channel_id}>`}`);
            }
        }
    }
};
