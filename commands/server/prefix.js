const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { first, run, query } = require('../../utils/database');
const { createEmbed } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');
const { COLORS } = require('../../utils/styles');

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

module.exports = {
    data: {
        name: 'prefix',
        description: 'Manage prefixes for the server',
        usage: ',prefix <set|remove|leaderboard>'
    },
    aliases: [],
    cooldown: 3,
    subcommands: ['set', 'remove', 'leaderboard'],
    subUsages: {
        set: ',prefix set ,',
        remove: ',prefix remove',
        leaderboard: ',prefix leaderboard'
    },

    async execute(message, args, client, config) {
        if (args.length) return sendCard(message, module.exports);
        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                title: 'Current Prefix',
                description: `The current prefix is: \`${(config && config.prefix) || ','}\``
            })]
        });
    },

    subs: {
        set: {
            aliases: [],
            data: { name: 'prefix set', description: 'Set command prefix for server', usage: ',prefix set ,' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const prefix = args.join(' ').trim();
                if (!prefix) return warn(message, 'Usage: `prefix set <prefix>`');
                if (prefix.length > 7) return warn(message, 'Prefix is too long!');

                if (first('SELECT 1 AS ok FROM prefixes WHERE guild_id = ?', message.guild.id)) {
                    run('UPDATE prefixes SET prefix = ? WHERE guild_id = ?', prefix, message.guild.id);
                } else {
                    run('INSERT INTO prefixes (guild_id, prefix) VALUES (?, ?)', message.guild.id, prefix);
                }
                updateGuildConfig(message.guild.id, { prefix });
                return approve(message, `Guild prefix now **configured** as \`${prefix}\``);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'prefix remove', description: 'Remove command prefix for server', usage: ',prefix remove' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT 1 AS ok FROM prefixes WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'This server does **not** have any prefix');
                }
                run('DELETE FROM prefixes WHERE guild_id = ?', message.guild.id);
                updateGuildConfig(message.guild.id, { prefix: ',' });
                return approve(message, 'Guild prefix removed');
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'prefix leaderboard', description: 'View the leaderboard of prefixes used for the bot', usage: ',prefix leaderboard' },
            execute: async (message) => {
                const rows = query('SELECT prefix, COUNT(*) as usage_count FROM prefixes GROUP BY prefix ORDER BY usage_count DESC');
                if (!rows.length) return warn(message, 'No prefixes found');
                const lines = rows.map(row => `**${row.prefix}** - ${row.usage_count} uses`);
                return paginate(message, lines, 'Prefix Leaderboard', guildAuthor(message));
            }
        }
    }
};
