const { PermissionFlagsBits, parseEmoji } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');
const { dangerousRole } = require('../../utils/roleGuard');

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
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
        return { error: 'This is **not** a message id or a message link' };
    }
    return { error: 'This is **not** a message id or a message link' };
}

function resolveEmoji(guild, token) {
    if (!token) return null;
    const custom = parseEmoji(token);
    if (custom && custom.id) {
        const found = guild.emojis.cache.get(custom.id) || guild.emojis.cache.find(e => e.name === custom.name);
        if (!found) return null;
        return `<:${found.name}:${found.id}>`;
    }
    const bare = token.replace(/^:+|:+$/g, '');
    const guildEmoji = guild.emojis.cache.find(e => e.name === bare);
    if (guildEmoji) return `<:${guildEmoji.name}:${guildEmoji.id}>`;
    if (token.includes(':')) return null;
    return token;
}

module.exports = {
    data: {
        name: 'reactionrole',
        description: 'Set up self-assignable roles with reactions',
        usage: ',reactionrole <add|remove|removeall|list|clear>'
    },
    aliases: ['rr'],
    subcommands: ['add', 'remove', 'removeall', 'list', 'clear'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'reactionrole add', description: 'Adds a reaction role to a message', usage: ',reactionrole add .../channels/... :skull: dead chat' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;
                const emojiToken = args[1];
                const roleText = args.slice(2).join(' ');
                if (!emojiToken || !roleText) {
                    return warn(message, 'Usage: `reactionrole add <message> <emoji> <role>`');
                }

                const emoji = resolveEmoji(message.guild, emojiToken);
                if (!emoji) return warn(message, `Emoji \`${emojiToken.replace(/^:|:$/g, '')}\` is not **available** on this server or it's not a valid emoji`);

                const guard = await dangerousRole(message, roleText, config);
                if (guard.error) return warn(message, guard.error);
                const role = guard.role;

                const check = first('SELECT 1 AS ok FROM reactionrole WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND emoji = ?',
                    message.guild.id, target.channel.id, target.id, emoji);
                if (check) return warn(message, 'A similar reaction role is **already** added');

                run('INSERT INTO reactionrole (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)',
                    message.guild.id, target.channel.id, target.id, emoji, role.id);

                try {
                    await target.react(emoji);
                } catch (err) {
                    if (err.code === 10008) {
                        return warn(message, 'Could not add the reaction to the message. It might be invalid or the message could have been deleted.');
                    }
                    return warn(message, 'An error occurred while trying to add the emoji');
                }
                return approve(message, `Added ${emoji} to [\`${target.id}\`](${target.url}) with ${role} assigned`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'reactionrole remove', description: 'Removes a reaction role from a message', usage: ',reactionrole remove .../channels/... :skull:' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;
                const emojiToken = args[1];
                if (!emojiToken) return warn(message, 'Usage: `reactionrole remove <message> <emoji>`');

                const emoji = resolveEmoji(message.guild, emojiToken) || emojiToken;
                const check = first('SELECT 1 AS ok FROM reactionrole WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND emoji = ?',
                    message.guild.id, target.channel.id, target.id, emoji);
                if (!check) return warn(message, 'No reaction role found for the message provided');

                run('DELETE FROM reactionrole WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND emoji = ?',
                    message.guild.id, target.channel.id, target.id, emoji);
                try {
                    const reaction = target.reactions.resolve(emoji);
                    if (reaction) await reaction.remove(message.guild.members.me);
                } catch (err) {}
                return approve(message, `**No longer** assigning role for ${emoji} for [\`${target.id}\`](${target.url})`);
            }
        },

        removeall: {
            aliases: [],
            data: { name: 'reactionrole removeall', description: 'Removes all reaction roles from a message', usage: ',reactionrole removeall .../channels/...' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageRoles)) return;
                const resolved = await resolveTargetMessage(message, args[0]);
                if (resolved.error) return warn(message, resolved.error);
                const target = resolved.msg;

                const check = first('SELECT 1 AS ok FROM reactionrole WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
                    message.guild.id, target.channel.id, target.id);
                if (!check) return warn(message, 'No reaction roles found for the message provided');

                run('DELETE FROM reactionrole WHERE guild_id = ? AND channel_id = ? AND message_id = ?',
                    message.guild.id, target.channel.id, target.id);
                await target.reactions.removeAll().catch(() => {});
                return approve(message, `**No longer** assigning roles for message [\`${target.id}\`](${target.url})`);
            }
        },

        list: {
            aliases: [],
            data: { name: 'reactionrole list', description: 'View a list of every reaction role', usage: ',reactionrole list' },
            async execute(message) {
                const rows = query('SELECT * FROM reactionrole WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No reaction roles available for this server');
                const lines = rows.map(row =>
                    `${row.emoji} [\`${row.message_id}\`](https://discord.com/channels/${message.guild.id}/${row.channel_id}/${row.message_id}) - <@&${row.role_id}>`);
                return paginate(message, lines, 'Reaction Roles', guildAuthor(message));
            }
        },

        clear: {
            aliases: [],
            data: { name: 'reactionrole clear', description: 'Clears every reaction role from guild', usage: ',reactionrole clear' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to clear **all** reaction roles from the server? The reactions won't be removed`,
                    async i => {
                        run('DELETE FROM reactionrole WHERE guild_id = ?', message.guild.id);
                        return i.update({
                            embeds: [successEmbed(null, `${i.user}: Cleared **all** reaction roles from the server`)],
                            components: []
                        }).catch(() => {});
                    },
                    async i => {
                        return i.update({
                            embeds: [errorEmbed(null, `${i.user}: Reaction roles deletion got canceled`)],
                            components: []
                        }).catch(() => {});
                    });
            }
        }
    }
};
