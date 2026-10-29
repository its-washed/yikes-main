const { PermissionFlagsBits, WebhookClient } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { altConvert, scriptPayload } = require('../../utils/embedScript');

function randomCode() {
    const source = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += source[Math.floor(Math.random() * source.length)];
    return out;
}

function validCode(message, code) {
    if (!code) {
        warn(message, 'Usage: provide a webhook code');
        return null;
    }
    const check = first('SELECT * FROM webhook WHERE guild_id = ? AND code = ?', message.guild.id, code);
    if (!check) {
        warn(message, 'There is no webhook associated with this code');
        return null;
    }
    return check;
}

module.exports = {
    data: { name: 'webhook', description: 'Set up webhooks in your server', usage: ',webhook <create|delete|send|list|edit>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['create', 'delete', 'send', 'list', 'edit'],
    subUsages: {
        create: ',webhook create #channel [name]',
        delete: ',webhook delete <code>',
        send: ',webhook send <code> <script>',
        list: ',webhook list',
        edit: ',webhook edit <name|avatar> <code> [value]'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        create: {
            aliases: [],
            data: { name: 'webhook create', description: 'Create webhook to forward messages to', usage: ',webhook create #channel [name]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `webhook create #channel [name]`');
                const name = args.filter(a => !/^<#\d+>$/.test(a)).join(' ').trim() || null;
                try {
                    const webhook = await channel.createWebhook({ name: 'evelina - webhook', reason: `Webhook created by ${message.author.tag}` });
                    const code = randomCode();
                    run('INSERT INTO webhook (guild_id, code, url, channel, name, avatar) VALUES (?, ?, ?, ?, ?, ?)',
                        message.guild.id, code, webhook.url, channel.toString(), name || client.user.username, client.user.displayAvatarURL());
                    return approve(message, `Created webhook named **${name || client.user.username}** in ${channel.toString()} with the code \`${code}\`. Please save it in order to send webhooks with it`);
                } catch (err) {
                    return warn(message, `Failed to create the webhook\n \`\`\`${err.message}\`\`\``);
                }
            }
        },
        delete: {
            aliases: [],
            data: { name: 'webhook delete', description: "Delete webhook for a channel", usage: ',webhook delete <code>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                const code = args[0];
                const check = validCode(message, code);
                if (!check) return;
                run('DELETE FROM webhook WHERE guild_id = ? AND code = ?', message.guild.id, code);
                try {
                    const webhook = new WebhookClient({ url: check.url });
                    await webhook.delete().catch(() => {});
                } catch {
                }
                return approve(message, `Deleted webhook \`${code}\``);
            }
        },
        send: {
            aliases: [],
            data: { name: 'webhook send', description: 'Send a message to an existing channel webhook.', usage: ',webhook send <code> <script>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                const code = args[0];
                const script = args.slice(1).join(' ').trim();
                if (!script) return sendCard(message, module.exports.subs.send);
                const check = validCode(message, code);
                if (!check) return;
                const nameLen = String(check.name || '').length;
                if (nameLen < 1 || nameLen > 80) return warn(message, 'The webhook username must be between `1` and `80` characters');
                if (String(check.name || '').toLowerCase().includes('discord')) return warn(message, 'The webhook username cannot contain the word `discord`');
                let avatarUrl = check.avatar;
                if (avatarUrl && !/^https?:\/\//.test(avatarUrl)) avatarUrl = client.user.displayAvatarURL();
                let result;
                try {
                    result = altConvert(message.member, script);
                } catch (err) {
                    return warn(message, err.message);
                }
                const payload = scriptPayload(result);
                payload.username = check.name;
                if (avatarUrl) payload.avatarURL = avatarUrl;
                payload.wait = true;
                try {
                    const webhook = new WebhookClient({ url: check.url });
                    const sent = await webhook.send(payload);
                    return approve(message, `Sent webhook -> ${sent.url}`);
                } catch (err) {
                    return warn(message, 'No webhook found with this code');
                }
            }
        },
        list: {
            aliases: [],
            data: { name: 'webhook list', description: 'List all available webhooks in the server', usage: ',webhook list' },
            execute: async (message) => {
                const results = query('SELECT * FROM webhook WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no webhooks in this server');
                return paginate(message, results.map(r => `\`${r.code}\` - ${r.channel}`), 'Webhooks',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        },
        edit: {
            aliases: [],
            data: { name: 'webhook edit', description: "Edit the webhook's look", usage: ',webhook edit <name|avatar> <code> [value]' },
            subcommands: ['name', 'avatar'],
            subUsages: {
                name: ',webhook edit name <code> <name>',
                avatar: ',webhook edit avatar <code> [url]'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.edit);
            },
            subs: {
                name: {
                    aliases: [],
                    data: { name: 'webhook edit name', description: "Edit a webhook's name", usage: ',webhook edit name <code> <name>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                        const code = args[0];
                        const name = args.slice(1).join(' ').trim();
                        if (!name) return warn(message, 'Usage: `webhook edit name <code> <name>`');
                        const check = validCode(message, code);
                        if (!check) return;
                        run('UPDATE webhook SET name = ? WHERE guild_id = ? AND code = ?', name, message.guild.id, code);
                        return approve(message, `Webhook name changed to **${name}**`);
                    }
                },
                avatar: {
                    aliases: ['icon'],
                    data: { name: 'webhook edit avatar', description: "Edit the webhook's avatar", usage: ',webhook edit avatar <code> [url]' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageWebhooks)) return;
                        const code = args[0];
                        let url = args.slice(1).join(' ').trim();
                        const check = validCode(message, code);
                        if (!check) return;
                        if (!url) {
                            const attachment = message.attachments.first();
                            if (!attachment) return warn(message, 'Avatar not found');
                            if (!/\.(png|jpeg|jpg)$/i.test(attachment.name || attachment.url)) return warn(message, 'Attachment must be a png or jpeg');
                            url = attachment.proxyURL || attachment.url;
                        }
                        run('UPDATE webhook SET avatar = ? WHERE guild_id = ? AND code = ?', url, message.guild.id, code);
                        return approve(message, "Changed webhook's avatar");
                    }
                }
            }
        }
    }
};
