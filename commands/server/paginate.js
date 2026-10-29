const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { altConvert, scriptPayload } = require('../../utils/embedScript');
const { paginationRows, currentPage, setCurrentPage } = require('../../utils/pagination');

function resolveMessage(message, args, index = 0) {
    const token = args[index];
    if (!token) return null;
    const match = String(token).match(/^(?:https?:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)|(\d{17,20}))$/);
    if (!match) return null;
    if (match[3]) return { id: match[3] };
    return { id: match[4] };
}

async function fetchTarget(message, token) {
    if (!token) return null;
    const match = String(token).match(/^(?:https?:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+))$/);
    let channelId = message.channel.id;
    let messageId = null;
    if (match) {
        channelId = match[2];
        messageId = match[3];
    } else if (/^\d{17,20}$/.test(String(token))) {
        messageId = String(token);
    }
    if (!messageId) return null;
    const channel = message.guild.channels.cache.get(String(channelId)) || message.channel;
    const target = await channel.messages.fetch(messageId).catch(() => null);
    return target;
}

module.exports = {
    data: { name: 'paginate', description: 'Create and manage paginated messages', usage: ',paginate <create|add|remove|edit|move|list|clear|reset>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['create', 'add', 'remove', 'edit', 'move', 'list', 'clear', 'reset'],
    subUsages: {
        create: ',paginate create <embed script>',
        add: ',paginate add <message link> <embed script>',
        remove: ',paginate remove <message link> <page>',
        edit: ',paginate edit <message link> <page> <embed script>',
        move: ',paginate move <message link> <page> <new page>',
        list: ',paginate list',
        clear: ',paginate clear <message link>',
        reset: ',paginate reset'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        create: {
            aliases: [],
            data: { name: 'paginate create', description: 'Creates a new paginated message starting with the first page', usage: ',paginate create {embed}$v{description: Hello world}' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const script = args.join(' ').trim();
                if (!script) return warn(message, 'Usage: `paginate create <embed script>`');
                let payload;
                try {
                    payload = scriptPayload(altConvert(message.member, script));
                } catch (err) {
                    return warn(message, err.message);
                }
                payload.components = paginationRows();
                const sent = await message.reply(payload);
                run('INSERT INTO paginate_embeds (guild_id, channel_id, message_id, embed, page) VALUES (?, ?, ?, ?, 1)',
                    message.guild.id, sent.channel.id, sent.id, script);
                run('INSERT INTO paginate_data (message_id, current_page) VALUES (?, 1)', sent.id);
            }
        },
        add: {
            aliases: [],
            data: { name: 'paginate add', description: 'Adds an embed to the next available page without gaps', usage: ',paginate add <message link> <embed script>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const target = await fetchTarget(message, args[0]);
                if (!target) return warn(message, 'Usage: `paginate add <message link> <embed script>`');
                const script = args.slice(1).join(' ').trim();
                if (!script) return warn(message, 'Usage: `paginate add <message link> <embed script>`');
                const existing = query('SELECT page FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ? ORDER BY page',
                    message.guild.id, target.channel.id, target.id);
                const pageNumber = existing.length + 1;
                run('INSERT INTO paginate_embeds (guild_id, channel_id, message_id, embed, page) VALUES (?, ?, ?, ?, ?)',
                    message.guild.id, target.channel.id, target.id, script, pageNumber);
                return approve(message, `Embed added to **page ${pageNumber}** for message ${target.url}`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'paginate remove', description: 'Removes an embed from a specified page, shifting pages to close gaps', usage: ',paginate remove <message link> <page>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const target = await fetchTarget(message, args[0]);
                const page = parseInt(args[1], 10);
                if (!target || !Number.isFinite(page)) return warn(message, 'Usage: `paginate remove <message link> <page>`');
                const info = run('DELETE FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    message.guild.id, target.channel.id, target.id, page);
                if (info && info.changes > 0) {
                    run('UPDATE paginate_embeds SET page = page - 1 WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page > ?',
                        message.guild.id, target.channel.id, target.id, page);
                    const current = currentPage(target.id);
                    if (current >= page) setCurrentPage(target.id, Math.max(1, current - 1));
                    return approve(message, `Removed **page ${page}** for message ${target.url}`);
                }
                return warn(message, `No **page ${page}** found for message ${target.id}`);
            }
        },
        edit: {
            aliases: [],
            data: { name: 'paginate edit', description: 'Edits an embed on a specified page', usage: ',paginate edit <message link> <page> <embed script>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const target = await fetchTarget(message, args[0]);
                const page = parseInt(args[1], 10);
                if (!target || !Number.isFinite(page)) return warn(message, 'Usage: `paginate edit <message link> <page> <embed script>`');
                const script = args.slice(2).join(' ').trim();
                if (!script) return warn(message, 'Usage: `paginate edit <message link> <page> <embed script>`');
                const info = run('UPDATE paginate_embeds SET embed = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    script, message.guild.id, target.channel.id, target.id, page);
                if (info && info.changes > 0) return approve(message, `Edited **page ${page}** for message ${target.url}`);
                return warn(message, `No **page ${page}** found for message ${target.id}`);
            }
        },
        move: {
            aliases: [],
            data: { name: 'paginate move', description: 'Swaps the embeds between two pages', usage: ',paginate move <message link> <page> <new page>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const target = await fetchTarget(message, args[0]);
                const page = parseInt(args[1], 10);
                const newPage = parseInt(args[2], 10);
                if (!target || !Number.isFinite(page) || !Number.isFinite(newPage)) return warn(message, 'Usage: `paginate move <message link> <page> <new page>`');
                const embed1Row = first('SELECT embed FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    message.guild.id, target.channel.id, target.id, page);
                const embed2Row = first('SELECT embed FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    message.guild.id, target.channel.id, target.id, newPage);
                if (!embed1Row || !embed2Row) return warn(message, `One of the pages ${page} or ${newPage} does not exist for message ${target.id}`);
                run('UPDATE paginate_embeds SET embed = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    embed2Row.embed, message.guild.id, target.channel.id, target.id, page);
                run('UPDATE paginate_embeds SET embed = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ? AND page = ?',
                    embed1Row.embed, message.guild.id, target.channel.id, target.id, newPage);
                return approve(message, `Swapped **page ${page}** with **page ${newPage}** for message ${target.url}`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'paginate list', description: 'Lists all paginated messages in the guild', usage: ',paginate list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const messages = query('SELECT message_id, channel_id FROM paginate_embeds WHERE guild_id = ?', message.guild.id);
                if (!messages.length) return warn(message, 'No paginated messages found');
                const seen = new Set();
                const lines = [];
                for (const row of messages) {
                    if (seen.has(row.message_id)) continue;
                    seen.add(row.message_id);
                    const link = `https://discord.com/channels/${message.guild.id}/${row.channel_id}/${row.message_id}`;
                    const count = query('SELECT COUNT(*) AS total FROM paginate_embeds WHERE message_id = ?', row.message_id)[0].total;
                    lines.push(`[\`${row.message_id}\`](${link}) - **${count} pages**`);
                }
                return paginate(message, lines, 'Paginated Messages');
            }
        },
        clear: {
            aliases: [],
            data: { name: 'paginate clear', description: 'Removes all embeds from a message', usage: ',paginate clear <message link>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const target = await fetchTarget(message, args[0]);
                if (!target) return warn(message, 'Usage: `paginate clear <message link>`');
                return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: Are you sure you want to clear all pages for [this message](${target.url})?`,
                    async (i) => {
                        run('DELETE FROM paginate_embeds WHERE guild_id = ? AND channel_id = ? AND message_id = ?', message.guild.id, target.channel.id, target.id);
                        run('DELETE FROM paginate_data WHERE message_id = ?', target.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Cleared all pages for [message](${target.url})` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Message clearing canceled` }], components: [] });
                    });
            }
        },
        reset: {
            aliases: [],
            data: { name: 'paginate reset', description: 'Removes all paginated messages', usage: ',paginate reset' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: Are you sure you want to reset all paginated messages in this guild?`,
                    async (i) => {
                        run('DELETE FROM paginate_data WHERE message_id IN (SELECT message_id FROM paginate_embeds WHERE guild_id = ?)', i.guild.id);
                        run('DELETE FROM paginate_embeds WHERE guild_id = ?', i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Cleared **all** paginated messages in the guild` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Paginated messages reset canceled` }], components: [] });
                    });
            }
        }
    }
};
