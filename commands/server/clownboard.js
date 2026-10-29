const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, prefix, confirm } = require('../../utils/moderation');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');

function moduleEnabled(guildId) {
    const row = first('SELECT clownboard FROM modules WHERE guild_id = ?', guildId);
    return Boolean(row && (row.clownboard === 1 || row.clownboard === true));
}

async function needEnabled(message) {
    if (moduleEnabled(message.guild.id)) return true;
    await warn(message, `Clownboard module is **not** enabled\n> Use \`${prefix(message)}clownboard enable\` to enable it`);
    return false;
}

function clownRow(guildId) {
    return first('SELECT * FROM clownboard WHERE guild_id = ?', guildId);
}

function resolveChannel(message, value) {
    if (!value) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const id = String(value).replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return null;
}

module.exports = {
    data: { name: 'clownboard', description: 'Showcase the best messages in your server', usage: ',clownboard <enable|disable|emoji|count|channel|config|reset|ignore>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'emoji', 'count', 'channel', 'config', 'reset', 'ignore'],
    subUsages: {
        enable: ',clownboard enable',
        disable: ',clownboard disable',
        emoji: ',clownboard emoji 🤡',
        count: ',clownboard count 3',
        channel: ',clownboard channel #clownboard',
        config: ',clownboard config',
        reset: ',clownboard reset',
        ignore: ',clownboard ignore <add|remove> <channel>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            aliases: ['on'],
            data: { name: 'clownboard enable', description: "Enable the suggestion module", usage: ',clownboard enable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (moduleEnabled(message.guild.id)) {
                    return warn(message, `Clownboard module is **already** enabled\n> Use \`${prefix(message)}clownboard disable\` to disable it`);
                }
                run('INSERT INTO modules (guild_id, clownboard) VALUES (?, 1) ON CONFLICT (guild_id) DO UPDATE SET clownboard = 1', message.guild.id);
                return approve(message, 'Clownboard module has been **enabled** in this server');
            }
        },
        disable: {
            aliases: ['off'],
            data: { name: 'clownboard disable', description: "Disable the suggestion module", usage: ',clownboard disable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                return confirm(message, `${message.author}: Are you sure you want to **disable** clownboard`,
                    async i => {
                        run('INSERT INTO modules (guild_id, clownboard) VALUES (?, 0) ON CONFLICT (guild_id) DO UPDATE SET clownboard = 0', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Clownboard module has been **disabled** in this server`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Clownboard deactivation got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        emoji: {
            aliases: [],
            data: { name: 'clownboard emoji', description: 'Sets the emoji that triggers the clownboard messages', usage: ',clownboard emoji 🤡' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                const emoji = args[0];
                if (!emoji) return warn(message, 'Usage: `clownboard emoji 🤡`');
                const check = clownRow(message.guild.id);
                if (!check) {
                    run('INSERT INTO clownboard (guild_id, channel_id, emoji, count) VALUES (?, ?, ?, ?)', message.guild.id, 0, emoji, 1);
                } else {
                    run('UPDATE clownboard SET emoji = ? WHERE guild_id = ?', emoji, message.guild.id);
                }
                return approve(message, `Set clownboard emoji to ${emoji}`);
            }
        },
        count: {
            aliases: [],
            data: { name: 'clownboard count', description: "Sets the default amount stars needed to post", usage: ',clownboard count 3' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                const count = parseInt(args[0], 10);
                if (!Number.isFinite(count)) return warn(message, 'Usage: `clownboard count <number>`');
                if (count < 1) return warn(message, 'Number can\'t be **lower** than **1**');
                const check = clownRow(message.guild.id);
                if (!check) {
                    run('INSERT INTO clownboard (guild_id, channel_id, emoji, count) VALUES (?, ?, ?, ?)', message.guild.id, 0, '', count);
                } else {
                    run('UPDATE clownboard SET count = ? WHERE guild_id = ?', count, message.guild.id);
                }
                return approve(message, `Set clownboard count to **${count}**`);
            }
        },
        channel: {
            aliases: [],
            data: { name: 'clownboard channel', description: 'Sets the channel where clownboard messages will be sent to', usage: ',clownboard channel #clownboard' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                const channel = resolveChannel(message, args[0]);
                if (!channel) return warn(message, 'Usage: `clownboard channel #channel`');
                const check = clownRow(message.guild.id);
                if (!check) {
                    run('INSERT INTO clownboard (guild_id, channel_id, emoji, count) VALUES (?, ?, ?, ?)', message.guild.id, channel.id, '', 1);
                } else {
                    run('UPDATE clownboard SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                }
                return approve(message, `Set clownboard channel to ${channel}`);
            }
        },
        config: {
            aliases: [],
            data: { name: 'clownboard config', description: 'View the settings for clownboard in guild', usage: ',clownboard config' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                const check = clownRow(message.guild.id);
                if (!check) return warn(message, 'Clownboard is **not** configured');
                return message.reply({
                    embeds: [{
                        color: 0x729bb0,
                        title: 'clownboard settings',
                        author: { name: message.guild.name, icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined },
                        fields: [
                            { name: 'Count', value: String(check.count), inline: true },
                            { name: 'Emoji', value: check.emoji || 'Not set', inline: true },
                            { name: 'Channel', value: Number(check.channel_id) > 0 ? `<#${check.channel_id}>` : 'Not set', inline: true }
                        ]
                    }]
                });
            }
        },
        reset: {
            aliases: [],
            data: { name: 'clownboard reset', description: "Resets guild's configuration for clownboard", usage: ',clownboard reset' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needEnabled(message)) return;
                return confirm(message, `${message.author}: Are you sure you want to **reset** clownboard`,
                    async i => {
                        run('DELETE FROM clownboard WHERE guild_id = ?', message.guild.id);
                        run('DELETE FROM clownboard_messages WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Reset clownboard`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Clownboard reset got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        ignore: {
            aliases: [],
            data: { name: 'clownboard ignore', description: 'Ignore channels from clownboard', usage: ',clownboard ignore <add|remove> <channel>' },
            subcommands: ['add', 'remove'],
            subUsages: {
                add: ',clownboard ignore add <channel>',
                remove: ',clownboard ignore remove <channel>'
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'clownboard ignore add', description: 'Add a channel to the ignore list', usage: ',clownboard ignore add #playground' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needEnabled(message)) return;
                        if (!clownRow(message.guild.id)) return warn(message, 'clownboard is **not** configured');
                        const target = resolveChannel(message, args[0]);
                        if (!target) return warn(message, 'Usage: `clownboard ignore add #channel`');
                        if (first('SELECT 1 AS ok FROM clownboard_ignored WHERE guild_id = ? AND channel_id = ?', message.guild.id, target.id)) {
                            return warn(message, 'This channel is already ignored');
                        }
                        run('INSERT INTO clownboard_ignored (guild_id, channel_id) VALUES (?, ?)', message.guild.id, target.id);
                        return approve(message, `Added ${target} to the ignore list`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'clownboard ignore remove', description: 'Remove a channel from the ignore list', usage: ',clownboard ignore remove #playground' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needEnabled(message)) return;
                        if (!clownRow(message.guild.id)) return warn(message, 'clownboard is **not** configured');
                        const target = resolveChannel(message, args[0]);
                        if (!target) return warn(message, 'Usage: `clownboard ignore remove #channel`');
                        if (!first('SELECT 1 AS ok FROM clownboard_ignored WHERE guild_id = ? AND channel_id = ?', message.guild.id, target.id)) {
                            return warn(message, 'This channel is not ignored');
                        }
                        run('DELETE FROM clownboard_ignored WHERE guild_id = ? AND channel_id = ?', message.guild.id, target.id);
                        return approve(message, `Removed ${target} from the ignore list`);
                    }
                }
            }
        }
    }
};
