const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run } = require('../../utils/database');

function resolveChannel(message, args) {
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const raw = String(args.join(' ') || '').trim().replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(raw)) return message.guild.channels.cache.get(raw) || null;
    if (raw) return message.guild.channels.cache.find((c) => c.name === raw) || null;
    return null;
}

module.exports = {
    data: { name: 'vanitytrack', description: 'Start tracking vanitys in a channel', usage: ',vanitytrack <add|remove|name|avatar>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'name', 'avatar'],
    subUsages: {
        add: ',vanitytrack add #vanity',
        remove: ',vanitytrack remove',
        name: ',vanitytrack name /evelina',
        avatar: ',vanitytrack avatar https://cdn.evelina.bot/e/12345678.png'
    },
    execute: async (message) => sendCard(message, module.exports),

    subs: {
        add: {
            aliases: [],
            data: { name: 'vanitytrack add', description: 'Add a channel for vanity tracking', usage: ',vanitytrack add #vanity' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                const channel = resolveChannel(message, args);
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,vanitytrack add #vanity`');
                if (first('SELECT * FROM webhook_vanity WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'The bot is already tracking vanity for this server');
                }
                let webhook = null;
                try {
                    const webhooks = (await channel.fetchWebhooks()).filter((hook) => hook.token);
                    webhook = webhooks.first() || null;
                    if (!webhook) webhook = await channel.createWebhook({ name: 'Evelina - Vanitys' });
                } catch (err) {
                    return warn(message, `Failed to create a webhook in ${channel}\n\`\`\`${err.message}\`\`\``);
                }
                const lengthArg = args.filter((a) => !String(a).includes(channel.id)).find((a) => /^\d+$/.test(String(a)));
                run('INSERT INTO webhook_vanity (guild_id, webhook_url, length) VALUES (?, ?, ?)',
                    message.guild.id, webhook.url, lengthArg ? Number(lengthArg) : null);
                return approve(message, `The bot will start tracking new available vanity in ${channel}`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'vanitytrack remove', description: 'Remove a channel for vanity tracking', usage: ',vanitytrack remove' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                if (!first('SELECT * FROM webhook_vanity WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Vanity tracking is **not** enabled in this server');
                }
                run('DELETE FROM webhook_vanity WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Disabled vanity tracking in this server');
            }
        },
        name: {
            aliases: [],
            data: { name: 'vanitytrack name', description: 'Set a custom name for the vanity webhook', usage: ',vanitytrack name /evelina' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name\n> Usage: `,vanitytrack name /evelina`');
                if (!first('SELECT * FROM webhook_vanity WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Vanity tracking is **not** enabled in this server');
                }
                run('UPDATE webhook_vanity SET name = ? WHERE guild_id = ?', name, message.guild.id);
                return approve(message, `Vanity webhook name updated to \`${name}\``);
            }
        },
        avatar: {
            aliases: [],
            data: { name: 'vanitytrack avatar', description: 'Set a custom avatar for the vanity webhook', usage: ',vanitytrack avatar https://cdn.evelina.bot/e/12345678.png' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const avatar = args.join(' ').trim();
                if (!avatar) return warn(message, 'You must provide an image URL\n> Usage: `,vanitytrack avatar https://cdn.evelina.bot/e/12345678.png`');
                if (!first('SELECT * FROM webhook_vanity WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Vanity tracking is **not** enabled in this server');
                }
                run('UPDATE webhook_vanity SET avatar = ? WHERE guild_id = ?', avatar, message.guild.id);
                return approve(message, 'Vanity webhook avatar updated');
            }
        }
    }
};
