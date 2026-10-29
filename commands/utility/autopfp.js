const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

const CATEGORIES = ['random', 'females', 'males', 'animes'];

module.exports = {
    data: { name: 'autopfp', description: 'Automatically send pfps to a channel', usage: ',autopfp <add|remove|name|avatar>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'name', 'avatar'],
    subUsages: {
        add: ',autopfp add #channel [category]',
        remove: ',autopfp remove [category]',
        name: ',autopfp name <category> <name>',
        avatar: ',autopfp avatar <category> <url|none>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'autopfp add', description: 'Add an autopfp channel', usage: ',autopfp add #channel [category]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.Administrator)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `autopfp add #channel [category]`');
                const category = args.filter(a => !/^<#\d+>$/.test(a)).join(' ').trim() || 'random';
                if (!CATEGORIES.includes(category)) {
                    return warn(message, '**Invalid category.**\nPlease choose from: **random**, **females**, **males**, **animes**.');
                }
                run('INSERT INTO autopost (guild_id, type, category, channel_id) VALUES (?, ?, ?, ?) ON CONFLICT (guild_id, type, category) DO UPDATE SET channel_id = ?',
                    message.guild.id, 'pfps', category, channel.id, channel.id);
                return approve(message, `Sending **${category}** pfps to ${channel.toString()}`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'autopfp remove', description: 'Remove an autopfp channel', usage: ',autopfp remove [category]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.Administrator)) return;
                const category = args.join(' ').trim() || 'random';
                if (!CATEGORIES.includes(category)) {
                    return warn(message, '**Invalid category.**\nPlease choose from: **random**, **females**, **males**, **animes**.');
                }
                run('DELETE FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'pfps', category);
                return approve(message, `Stopped sending **${category}** pfps`);
            }
        },
        name: {
            aliases: [],
            data: { name: 'autopfp name', description: 'Change the way how the bot webhook is named', usage: ',autopfp name <category> <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const category = args[0];
                const name = args.slice(1).join(' ').trim();
                if (!category || !name) return warn(message, 'Usage: `autopfp name <category> <name>`');
                const res = first('SELECT * FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'pfps', category);
                if (!res) return warn(message, `**${category}** is not an autopfp category.`);
                if (['remove', 'reset', 'none'].includes(name.toLowerCase())) {
                    run('UPDATE autopost SET webhook_name = NULL WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'pfps', category);
                    return approve(message, `Reset the name for **${category}**`);
                }
                run('UPDATE autopost SET webhook_name = ? WHERE guild_id = ? AND type = ? AND category = ?', name, message.guild.id, 'pfps', category);
                return approve(message, `Set the webhook-name for **${category}** to **${name}**`);
            }
        },
        avatar: {
            aliases: [],
            data: { name: 'autopfp avatar', description: 'Change the way how the bot webhook is avatar', usage: ',autopfp avatar <category> <url|none>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const category = args[0];
                const avatar = args.slice(1).join(' ').trim();
                if (!category || !avatar) return warn(message, 'Usage: `autopfp avatar <category> <url|none>`');
                const res = first('SELECT * FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'pfps', category);
                if (!res) return warn(message, `**${category}** is not an autopfp category.`);
                if (['none', 'remove', 'reset'].includes(avatar.toLowerCase())) {
                    run('UPDATE autopost SET webhook_avatar = NULL WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'pfps', category);
                    return approve(message, `Reset the avatar for **${category}**`);
                }
                if (!/^https?:\/\//i.test(avatar)) return warn(message, 'This is **not** a valid Image URL');
                run('UPDATE autopost SET webhook_avatar = ? WHERE guild_id = ? AND type = ? AND category = ?', avatar, message.guild.id, 'pfps', category);
                return approve(message, `Set the webhook-avatar for **${category}** to [**this**](${avatar})`);
            }
        }
    }
};
