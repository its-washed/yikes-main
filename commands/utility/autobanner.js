const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');

module.exports = {
    data: { name: 'autobanner', description: 'Automatically send banners to a channel', usage: ',autobanner <add|remove|name|avatar>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'name', 'avatar'],
    subUsages: {
        add: ',autobanner add #channel',
        remove: ',autobanner remove',
        name: ',autobanner name <name>',
        avatar: ',autobanner avatar <url|none>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'autobanner add', description: 'Add an autobanner channel', usage: ',autobanner add #channel' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.Administrator)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `autobanner add #channel`');
                run('INSERT INTO autopost (guild_id, type, category, channel_id) VALUES (?, ?, ?, ?) ON CONFLICT (guild_id, type, category) DO UPDATE SET channel_id = ?',
                    message.guild.id, 'banners', 'banners', channel.id, channel.id);
                return approve(message, `Sending **banners** to ${channel.toString()}`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'autobanner remove', description: 'Remove an autobanner channel', usage: ',autobanner remove' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.Administrator)) return;
                run('DELETE FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'banners', 'banners');
                return approve(message, 'Stopped sending **banners**');
            }
        },
        name: {
            aliases: [],
            data: { name: 'autobanner name', description: 'Change the way how the bot webhook is named', usage: ',autobanner name <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `autobanner name <name>`');
                const res = first('SELECT * FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'banners', 'banners');
                if (!res) return warn(message, 'Autopost for **banners** is **not** enabled.');
                if (['remove', 'reset', 'none'].includes(name.toLowerCase())) {
                    run('UPDATE autopost SET webhook_name = NULL WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'banners', 'banners');
                    return approve(message, 'Reset the webhook-name for **banners**');
                }
                run('UPDATE autopost SET webhook_name = ? WHERE guild_id = ? AND type = ? AND category = ?', name, message.guild.id, 'banners', 'banners');
                return approve(message, `Set the webhook-name for **banners** to **${name}**`);
            }
        },
        avatar: {
            aliases: [],
            data: { name: 'autobanner avatar', description: 'Change the way how the bot webhook is avatar', usage: ',autobanner avatar <url|none>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const avatar = args.join(' ').trim();
                if (!avatar) return warn(message, 'Usage: `autobanner avatar <url|none>`');
                const res = first('SELECT * FROM autopost WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'banners', 'banners');
                if (!res) return warn(message, 'Autopost for **banners** is **not** enabled.');
                if (['none', 'remove', 'reset'].includes(avatar.toLowerCase())) {
                    run('UPDATE autopost SET webhook_avatar = NULL WHERE guild_id = ? AND type = ? AND category = ?', message.guild.id, 'banners', 'banners');
                    return approve(message, 'Reset the avatar for **banners**');
                }
                if (!/^https?:\/\//i.test(avatar)) return warn(message, 'This is **not** a valid Image URL');
                run('UPDATE autopost SET webhook_avatar = ? WHERE guild_id = ? AND type = ? AND category = ?', avatar, message.guild.id, 'banners', 'banners');
                return approve(message, `Set the webhook-avatar for **banners** to [**this**](${avatar})`);
            }
        }
    }
};
