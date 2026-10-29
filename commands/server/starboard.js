const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

function starboardRow(guildId) {
    return first('SELECT * FROM starboard WHERE guild_id = ?', guildId);
}

function needEnabled(message) {
    const check = first('SELECT starboard FROM modules WHERE guild_id = ?', message.guild.id);
    if (!check || !check.starboard) {
        warn(message, 'Starboard module is **not** enabled\n> Use `,starboard enable` to enable it');
        return false;
    }
    return true;
}

module.exports = {
    data: { name: 'starboard', description: 'Showcase the best messages in your server', usage: ',starboard <enable|disable|emoji|count|channel|config|reset|ignore>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'emoji', 'count', 'channel', 'config', 'reset', 'ignore'],
    subUsages: {
        enable: ',starboard enable',
        disable: ',starboard disable',
        emoji: ',starboard emoji ⭐',
        count: ',starboard count 3',
        channel: ',starboard channel #starboard',
        config: ',starboard config',
        reset: ',starboard reset',
        ignore: ',starboard ignore <add|remove>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            aliases: ['on'],
            data: { name: 'starboard enable', description: 'Enable the suggestion module', usage: ',starboard enable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT starboard FROM modules WHERE guild_id = ?', message.guild.id);
                if (check && check.starboard) return warn(message, 'Starboard module is **already** enabled in this server');
                run('INSERT INTO modules (guild_id, starboard) VALUES (?, TRUE) ON CONFLICT (guild_id) DO UPDATE SET starboard = TRUE', message.guild.id);
                return approve(message, 'Starboard module has been **enabled** in this server');
            }
        },
        disable: {
            aliases: ['off'],
            data: { name: 'starboard disable', description: 'Disable the suggestion module', usage: ',starboard disable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT starboard FROM modules WHERE guild_id = ?', message.guild.id);
                if (!check || !check.starboard) return warn(message, 'Starboard module is **not** enabled\n> Use `,starboard enable` to enable it');
                return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: Are you sure you want to **disable** starboard`,
                    async (i) => {
                        run('INSERT INTO modules (guild_id, starboard) VALUES (?, FALSE) ON CONFLICT (guild_id) DO UPDATE SET starboard = FALSE', i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Starboard module has been **disabled** in this server` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Starboard deactivation got canceled` }], components: [] });
                    });
            }
        },
        emoji: {
            aliases: [],
            data: { name: 'starboard emoji', description: 'Sets the emoji that triggers the starboard messages', usage: ',starboard emoji ⭐' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const emoji = args[0];
                if (!emoji) return warn(message, 'Usage: `starboard emoji ⭐`');
                const check = starboardRow(message.guild.id);
                if (!check) run('INSERT INTO starboard (guild_id, channel_id, emoji, count) VALUES (?, NULL, ?, 1)', message.guild.id, emoji);
                else run('UPDATE starboard SET emoji = ? WHERE guild_id = ?', emoji, message.guild.id);
                return approve(message, `Set starboard emoji to ${emoji}`);
            }
        },
        count: {
            aliases: [],
            data: { name: 'starboard count', description: 'Sets the default amount stars needed to post', usage: ',starboard count 3' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const count = parseInt(args[0], 10);
                if (!Number.isFinite(count)) return warn(message, 'Usage: `starboard count <number>`');
                if (count < 1) return warn(message, "Number can't be **lower** than **1**");
                const check = starboardRow(message.guild.id);
                if (!check) run('INSERT INTO starboard (guild_id, channel_id, emoji, count) VALUES (?, NULL, NULL, ?)', message.guild.id, count);
                else run('UPDATE starboard SET count = ? WHERE guild_id = ?', count, message.guild.id);
                return approve(message, `Set starboard count to **${count}**`);
            }
        },
        channel: {
            aliases: [],
            data: { name: 'starboard channel', description: 'Sets the channel where starboard messages will be sent to', usage: ',starboard channel #starboard' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `starboard channel #channel`');
                const check = starboardRow(message.guild.id);
                if (!check) run('INSERT INTO starboard (guild_id, channel_id, emoji, count) VALUES (?, ?, NULL, 1)', message.guild.id, channel.id);
                else run('UPDATE starboard SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Set starboard channel to ${channel.toString()}`);
            }
        },
        config: {
            aliases: [],
            data: { name: 'starboard config', description: 'View the settings for starboard in guild', usage: ',starboard config' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                const check = starboardRow(message.guild.id);
                if (!check) return warn(message, 'Starboard is **not** configured');
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        author: { name: 'starboard settings', icon_url: message.guild.iconURL({ size: 256 }) || undefined },
                        fields: [
                            { name: 'Count', value: String(check.count), inline: true },
                            { name: 'Emoji', value: String(check.emoji), inline: true },
                            { name: 'Channel', value: `<#${check.channel_id}>`, inline: true }
                        ]
                    }]
                });
            }
        },
        reset: {
            aliases: [],
            data: { name: 'starboard reset', description: "Resets guild's configuration for starboard", usage: ',starboard reset' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message)) return;
                return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: Are you sure you want to **disable** starboard`,
                    async (i) => {
                        run('DELETE FROM starboard WHERE guild_id = ?', i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Disabled starboard` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Starboard deactivation got canceled` }], components: [] });
                    });
            }
        },
        ignore: {
            aliases: [],
            data: { name: 'starboard ignore', description: 'Ignore channels or users from starboard', usage: ',starboard ignore <add|remove>' },
            subcommands: ['add', 'remove'],
            subUsages: {
                add: ',starboard ignore add #channel',
                remove: ',starboard ignore remove #channel'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.ignore);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'starboard ignore add', description: 'Add a channel or user to the ignore list', usage: ',starboard ignore add #channel' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!needEnabled(message)) return;
                        const target = message.mentions.channels.first();
                        if (!target) return warn(message, 'Usage: `starboard ignore add #channel`');
                        const check = starboardRow(message.guild.id);
                        if (!check) return warn(message, 'Starboard is **not** configured');
                        const ignored = query('SELECT * FROM starboard_ignored WHERE guild_id = ?', message.guild.id);
                        if (ignored.some(row => String(row.channel_id) === String(target.id))) return warn(message, 'This channel is already ignored');
                        run('INSERT INTO starboard_ignored (guild_id, channel_id) VALUES (?, ?)', message.guild.id, target.id);
                        return approve(message, `Added ${target.toString()} to the ignore list`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'starboard ignore remove', description: 'Remove a channel or user from the ignore list', usage: ',starboard ignore remove #channel' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!needEnabled(message)) return;
                        const mentioned = message.mentions.channels.first();
                        const channelId = mentioned ? mentioned.id : String(args.join(' ')).replace(/[<#>]/g, '').trim();
                        if (!/^\d{17,20}$/.test(channelId)) return warn(message, 'Usage: `starboard ignore remove #channel`');
                        const check = starboardRow(message.guild.id);
                        if (!check) return warn(message, 'Starboard is **not** configured');
                        const ignored = query('SELECT * FROM starboard_ignored WHERE guild_id = ?', message.guild.id);
                        if (!ignored.some(row => String(row.channel_id) === String(channelId))) return warn(message, 'This channel is not ignored');
                        run('DELETE FROM starboard_ignored WHERE guild_id = ? AND channel_id = ?', message.guild.id, channelId);
                        const channel = message.guild.channels.cache.get(String(channelId));
                        return approve(message, `Removed ${channel ? channel.toString() : `<#${channelId}>`} from the ignore list`);
                    }
                }
            }
        }
    }
};
