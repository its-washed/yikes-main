const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, parseEmoji } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');
const { dangerousRole } = require('../../utils/roleGuard');
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

function rowToBuilder(row) {
    return ActionRowBuilder.from(typeof row.toJSON === 'function' ? row.toJSON() : row);
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

async function addButtonToMessage(msg, customId, label, emoji, color) {
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

module.exports = {
    data: {
        name: 'buttonrole',
        description: 'Buttonrole commands',
        usage: ',buttonrole <add|remove|clear|list|unique>'
    },
    subcommands: ['add', 'remove', 'clear', 'list', 'unique'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'buttonrole add', description: "Add a button to a message\n> If you don't want to use an emoji/label, just type `none`", usage: ',buttonrole add .../channels/... member Verify ✅ green' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;
                const roleText = args[1];
                const label = args[2];
                const emoji = args[3] || 'none';
                const color = args[4] || 'grey';
                if (!roleText || !label) {
                    return warn(message, 'Usage: `buttonrole add <message> <role> <label> [emoji] [color]`\n**Important:** If you don\'t want to use an emoji or label, just type `none`');
                }

                const guard = await dangerousRole(message, roleText, config);
                if (guard.error) return warn(message, guard.error);
                const role = guard.role;

                if (target.author.id !== client.user.id) return warn(message, "I can't add buttons to messages that I didn't send");

                const customId = crypto.randomBytes(6).toString('base64url').slice(0, 8);
                try {
                    await addButtonToMessage(target, customId, label, emoji, color);
                } catch (err) {
                    return warn(message, 'Failed to create the button\n**Important:** If you don\'t want to use an emoji, just type `none`');
                }

                run('INSERT INTO button_role (guild_id, channel_id, message_id, button_id, role_id, label, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    message.guild.id, target.channel.id, target.id, customId, role.id, label === 'none' ? '​' : label, emoji);
                return approve(message, `Added button with role ${role} [**here**](${target.url})`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'buttonrole remove', description: 'Remove a specific button from a message by its custom_id', usage: ',buttonrole remove KbJNGwwY' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const buttonId = args[0];
                if (!buttonId) return warn(message, 'Usage: `buttonrole remove <buttonId>`');
                const row = first('SELECT * FROM button_role WHERE guild_id = ? AND button_id = ?', message.guild.id, buttonId);
                if (!row) return warn(message, `Button **${buttonId}** couldn't be found`);

                const channel = message.guild.channels.cache.get(row.channel_id);
                const removeRow = () => run('DELETE FROM button_role WHERE guild_id = ? AND button_id = ?', message.guild.id, buttonId);

                if (!channel || !channel.messages) {
                    return confirm(message,
                        `${EMOJIS.QUESTION} ${message.author}: Message couldn't be found. However, message still exist in the database.\n> Do you want to remove them?`,
                        async i => {
                            removeRow();
                            return i.update({
                                embeds: [successEmbed(null, `${i.user}: Removed button (\`${buttonId}\`) from this [**message**](https://discord.com/channels/${row.guild_id}/${row.channel_id}/${row.message_id})`)],
                                components: []
                            }).catch(() => {});
                        },
                        async i => {
                            return i.update({
                                embeds: [errorEmbed(null, `${i.user}: Button roles deletion got canceled.`)],
                                components: []
                            }).catch(() => {});
                        });
                }

                let target;
                try {
                    target = await channel.messages.fetch(row.message_id);
                } catch (err) {
                    return warn(message, 'Could not find this message. It might be invalid or the message could have been deleted');
                }
                if (!target.components.length) return warn(message, "This message doesn't have any buttons");

                try {
                    const rows = target.components
                        .map(rowToBuilder)
                        .map(r => r.setComponents(r.components.filter(c => c.data.custom_id !== buttonId)))
                        .filter(r => r.components.length > 0);
                    await target.edit({ components: rows });
                    removeRow();
                    return approve(message, `Button **${buttonId}** has been removed from this [**message**](${target.url})`);
                } catch (err) {
                    return warn(message, 'An error occurred while removing the button\n```' + err.message + '```');
                }
            }
        },

        clear: {
            aliases: [],
            data: { name: 'buttonrole clear', description: 'Remove all buttons from a message', usage: ',buttonrole clear .../channels/...' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;

                const check = first('SELECT 1 AS ok FROM button_role WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
                    message.guild.id, target.channel.id, target.id);
                if (!check) return warn(message, 'There are no buttons in this message.');

                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to clear **all** button roles from this [**message**](${target.url})?`,
                    async i => {
                        try { await target.edit({ components: [] }); } catch (err) {}
                        run('DELETE FROM button_role WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
                            message.guild.id, target.channel.id, target.id);
                        run('DELETE FROM button_settings WHERE guild_id = ? AND message_id = ?', message.guild.id, target.id);
                        return i.update({
                            embeds: [successEmbed(null, `${i.user}: Removed all buttons from this [**message**](${target.url})`)],
                            components: []
                        }).catch(() => {});
                    },
                    async i => {
                        return i.update({
                            embeds: [errorEmbed(null, `${i.user}: Button roles deletion got canceled.`)],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        list: {
            aliases: [],
            data: { name: 'buttonrole list', description: 'View a list of every button role', usage: ',buttonrole list' },
            async execute(message) {
                const rows = query('SELECT * FROM button_role WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No button roles available for this server');
                const lines = rows.map(row => {
                    const emojiPart = row.emoji && row.emoji !== 'none' ? `${row.emoji} ` : '';
                    return `${emojiPart}**${row.label}** <@&${row.role_id}> (\`${row.button_id}\`) [**here**](https://discord.com/channels/${message.guild.id}/${row.channel_id}/${row.message_id})`;
                });
                return paginate(message, lines, 'Button Roles', guildAuthor(message));
            }
        },

        unique: {
            aliases: [],
            data: { name: 'buttonrole unique', description: 'Set whether the roles on a message are unique (only one role allowed).', usage: ',buttonrole unique .../channels/... true/false' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;

                const option = String(args[1] || '').toLowerCase();
                if (!['true', 'false', 'on', 'off', 'yes', 'no'].includes(option)) {
                    return warn(message, 'Usage: `buttonrole unique <message> <true|false>`');
                }
                const unique = ['true', 'on', 'yes'].includes(option);

                const check = first('SELECT 1 AS ok FROM button_role WHERE guild_id = ? AND message_id = ?',
                    message.guild.id, target.id);
                if (!check) return warn(message, `No buttons are assigned to [this message](${target.url})`);

                run('DELETE FROM button_settings WHERE guild_id = ? AND message_id = ?', message.guild.id, target.id);
                run('INSERT INTO button_settings (guild_id, channel_id, message_id, "unique") VALUES (?, ?, ?, ?)',
                    message.guild.id, target.channel.id, target.id, unique);
                const state = unique ? 'enabled' : 'disabled';
                return approve(message, `Unique role behavior for [this message](${target.url}) has been ${state}`);
            }
        }
    }
};

async function toggleButtonRole(interaction, roleId) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const guild = interaction.guild;
    const role = guild.roles.cache.get(String(roleId));
    if (!role) {
        return interaction.followup({
            embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${interaction.user}: Role couldn't be found on this guild` }],
            ephemeral: true
        }).catch(() => {});
    }

    const member = interaction.member;
    const botMember = guild.members.me;
    if (botMember && role.position >= botMember.roles.highest.position) {
        return interaction.followup({
            embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${interaction.user}: Bot is **missing** the following permission: \`manage_roles\`` }],
            ephemeral: true
        }).catch(() => {});
    }

    try {
        const uniqueSetting = first('SELECT "unique" FROM button_settings WHERE guild_id = ? AND message_id = ?',
            guild.id, interaction.message.id);
        if (uniqueSetting && uniqueSetting.unique) {
            const rows = query('SELECT role_id FROM button_role WHERE guild_id = ? AND message_id = ?',
                guild.id, interaction.message.id);
            const memberRoleIds = new Set(member.roles.cache.map(r => String(r.id)));
            const toRemove = rows
                .map(row => String(row.role_id))
                .filter(id => memberRoleIds.has(id) && id !== String(role.id))
                .map(id => guild.roles.cache.get(id))
                .filter(Boolean);
            if (toRemove.length) await member.roles.remove(toRemove, 'Unique button role');
        }
    } catch (err) {
        return interaction.followup({
            embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${interaction.user}: An error occurred while processing roles` }],
            ephemeral: true
        }).catch(() => {});
    }

    let color;
    let emoji;
    let text;
    if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, 'Button role toggle').catch(() => {});
        color = 0xff3939;
        emoji = EMOJIS.DENY;
        text = `Removed role ${role}`;
    } else {
        await member.roles.add(role, 'Button role toggle').catch(() => {});
        color = 0x39ffb8;
        emoji = EMOJIS.APPROVE;
        text = `Added role ${role}`;
    }
    return interaction.followup({
        embeds: [{ color, description: `${emoji} ${interaction.user}: ${text}` }],
        ephemeral: true
    }).catch(() => {});
}

module.exports.toggleButtonRole = toggleButtonRole;
