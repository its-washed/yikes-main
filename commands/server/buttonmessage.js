const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, parseEmoji } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');
const crypto = require('crypto');

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

function styleFromColor(color) {
    switch (String(color || '').toLowerCase()) {
        case 'green': return ButtonStyle.Success;
        case 'red': return ButtonStyle.Danger;
        case 'grey': return ButtonStyle.Secondary;
        case 'blue': return ButtonStyle.Primary;
        default: return ButtonStyle.Secondary;
    }
}

async function resolveTargetMessage(message, input) {
    const link = /(?:https?:\/\/)?(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/.exec(input || '');
    try {
        if (link) {
            if (link[1] !== message.guild.id) return { error: 'That message is in another server.' };
            const channel = message.guild.channels.cache.get(link[2]);
            if (!channel || !channel.messages) return { error: 'Could not find this message. I do not have access to this channel.' };
            return { msg: await channel.messages.fetch(link[3]) };
        }
        if (/^\d+$/.test(input)) {
            return { msg: await message.channel.messages.fetch(input) };
        }
    } catch (err) {
        return { error: 'Could not find this message. It might be invalid or the message could have been deleted' };
    }
    return { error: 'This is **not** a message id or a message link' };
}

function rowToBuilder(row) {
    return ActionRowBuilder.from(typeof row.toJSON === 'function' ? row.toJSON() : row);
}

async function rebuildButton(message, msg, customId, label, emoji, color) {
    const rows = msg.components.map(rowToBuilder);
    let target = rows.find(row => row.components.length < 5);
    if (!target) {
        target = new ActionRowBuilder();
        rows.push(target);
    }
    const button = new ButtonBuilder().setCustomId(customId).setStyle(styleFromColor(color));
    button.setLabel(label === 'none' ? '​' : label);
    if (emoji && emoji !== 'none') button.setEmoji(emoji);
    target.addComponents(button);
    await msg.edit({ components: rows });
}

async function stripButton(msg, customId) {
    const rows = msg.components
        .map(rowToBuilder)
        .map(row => row.setComponents(row.components.filter(c => c.data.custom_id !== customId)))
        .filter(row => row.components.length > 0);
    await msg.edit({ components: rows });
}

module.exports = {
    data: {
        name: 'buttonmessage',
        description: "Buttonmessage commands",
        usage: ',buttonmessage <add|edit|remove|clear|list>'
    },
    aliases: ['buttonmsg'],
    subcommands: ['add', 'edit', 'remove', 'clear', 'list'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'buttonmessage add', description: "Add a button to a message\n> If you don't want to use an emoji/label, just type `none`", usage: ',buttonmessage add .../channels/... Rules ✅ green {embed}$v{description: Hello World!}' },
            async execute(message, args, client) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;
                const label = args[1];
                const emoji = args[2];
                const color = args[3];
                const embed = args.slice(4).join(' ');
                if (!label || !emoji || !color || !embed) {
                    return warn(message, 'Usage: `buttonmessage add <message> <label> <emoji> <color> <embed code>`\n**Important:** If you don\'t want to use an emoji or label, just type `none`');
                }
                if (target.author.id !== client.user.id) return warn(message, "I can't add buttons to messages that I didn't send");

                const customId = crypto.randomBytes(6).toString('base64url').slice(0, 8);
                try {
                    await rebuildButton(message, target, customId, label, emoji, color);
                } catch (err) {
                    return warn(message, 'Failed to create the button\n**Important:** If you don\'t want to use an emoji, just type `none`');
                }
                const storedLabel = label === 'none' ? '​' : label;
                run('INSERT INTO button_message (guild_id, channel_id, message_id, button_id, embed, label, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    message.guild.id, target.channel.id, target.id, customId, embed, storedLabel, emoji);
                return approve(message, `Added button with embed response [**here**](${target.url})\n\`\`\`${embed}\`\`\``);
            }
        },

        edit: {
            aliases: [],
            data: { name: 'buttonmessage edit', description: "Edit a button's embed response", usage: ',buttonmessage edit KbJNGwwY {embed}$v{description: Hello World!}' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const buttonId = args[0];
                const embed = args.slice(1).join(' ').trim();
                if (!buttonId || !embed) return warn(message, 'Usage: `buttonmessage edit <buttonId> <embed code>`');
                const check = first('SELECT 1 AS ok FROM button_message WHERE guild_id = ? AND button_id = ?', message.guild.id, buttonId);
                if (!check) return warn(message, "Button couldn't be found");
                run('UPDATE button_message SET embed = ? WHERE guild_id = ? AND button_id = ?', embed, message.guild.id, buttonId);
                return approve(message, `Button's embed response has been updated to:\n\`\`\`${embed}\`\`\``);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'buttonmessage remove', description: 'Remove a specific button from a message by its custom_id', usage: ',buttonmessage remove KbJNGwwY' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const buttonId = args[0];
                if (!buttonId) return warn(message, 'Usage: `buttonmessage remove <buttonId>`');
                const row = first('SELECT * FROM button_message WHERE guild_id = ? AND button_id = ?', message.guild.id, buttonId);
                if (!row) return warn(message, `Button **${buttonId}** couldn't be found`);

                const channel = message.guild.channels.cache.get(row.channel_id);
                const removeRow = () => run('DELETE FROM button_message WHERE guild_id = ? AND button_id = ?', message.guild.id, buttonId);

                if (!channel || !channel.messages) {
                    return confirm(message,
                        `${EMOJIS.QUESTION} ${message.author}: Message couldn't be found. However, message still exist in the database.\n> Do you want to remove them?`,
                        async i => {
                            removeRow();
                            return i.update({ embeds: [successEmbed(null, `${i.user}: Removed button (\`${buttonId}\`) from this [**message**](https://discord.com/channels/${row.guild_id}/${row.channel_id}/${row.message_id})`)], components: [] }).catch(() => {});
                        },
                        async i => {
                            return i.update({ embeds: [errorEmbed(null, `${i.user}: Button deletion got canceled.`)], components: [] }).catch(() => {});
                        });
                }

                let target;
                try {
                    target = await channel.messages.fetch(row.message_id);
                } catch (err) {
                    return warn(message, "Could not find this message. It might be invalid or the message could have been deleted");
                }
                if (!target.components.length) return warn(message, "This message doesn't have any buttons");
                try {
                    await stripButton(target, buttonId);
                    removeRow();
                    return approve(message, `Button **${buttonId}** has been removed from this [**message**](${target.url})`);
                } catch (err) {
                    return warn(message, `An error occurred while removing the button\n\`\`\`${err.message}\`\`\``);
                }
            }
        },

        clear: {
            aliases: [],
            data: { name: 'buttonmessage clear', description: 'Remove all buttons from a message', usage: ',buttonmessage clear .../channels/...' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;
                const check = first('SELECT 1 AS ok FROM button_message WHERE guild_id = ? AND channel_id = ? AND message_id = ?', message.guild.id, target.channel.id, target.id);
                if (!check) return warn(message, 'There are no buttons in this message.');

                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to clear **all** button messages from this [**message**](${target.url})?`,
                    async i => {
                        try { await target.edit({ components: [] }); } catch (err) {}
                        run('DELETE FROM button_message WHERE guild_id = ? AND channel_id = ? AND message_id = ?', message.guild.id, target.channel.id, target.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Removed all buttons from this [**message**](${target.url})`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Button messages deletion got canceled.`)], components: [] }).catch(() => {});
                    });
            }
        },

        list: {
            aliases: [],
            data: { name: 'buttonmessage list', description: "View a list of every button role", usage: ',buttonmessage list' },
            async execute(message) {
                const rows = query('SELECT * FROM button_message WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No button messages available for this server');
                const lines = rows.map(row => `${row.emoji ? `${row.emoji} ` : ''}**${row.label}** (\`${row.button_id}\`) [**here**](https://discord.com/channels/${row.guild_id}/${row.channel_id}/${row.message_id})`);
                return paginate(message, lines, 'Button Messages', guildAuthor(message));
            }
        }
    }
};
