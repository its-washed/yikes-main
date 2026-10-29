const { PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { parseEmoji, emojiUrl, fetchBytes, resizePng, checkEmojiBucket, buildZip } = require('../../utils/emojiTools');

function attachmentsOf(message) {
    if (message.attachments.size) return [...message.attachments.values()];
    if (message.reference && message.reference.resolved && message.reference.resolved.attachments) {
        return [...message.reference.resolved.attachments.values()];
    }
    return [];
}

async function firstSticker(message) {
    if (message.stickers.size) return message.stickers.first();
    if (message.reference && message.reference.resolved && message.reference.resolved.stickers && message.reference.resolved.stickers.size) {
        return message.reference.resolved.stickers.first();
    }
    const history = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (history) {
        for (const entry of history.values()) {
            if (entry.stickers.size) return entry.stickers.first();
        }
    }
    return null;
}

function guildEmoji(message, token) {
    const parsed = parseEmoji(token);
    if (!parsed) return null;
    return message.guild.emojis.cache.get(parsed.id) || null;
}

module.exports = {
    data: { name: 'emoji', description: "Manage the server's emojis", usage: ',emoji <add|steal|remove|rename|list|info|enlarge|search|zip|addmulti|sticker>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'steal', 'remove', 'rename', 'list', 'info', 'enlarge', 'search', 'zip', 'addmulti', 'sticker'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, steal, remove, rename, list, info, enlarge, search, zip, addmulti, sticker');
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'emoji add', description: 'Add an emoji to the server', usage: ',emoji add <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const attachments = attachmentsOf(message);
                if (!attachments.length) return warn(message, 'Please attach an image to use as a sticker.');
                const attachment = attachments[0];
                const contentType = String(attachment.contentType || '');
                if (!contentType.startsWith('image/')) return warn(message, 'Attached file must be an image.');
                const bytes = await fetchBytes(attachment.url);
                if (!bytes) return warn(message, 'Attached file must be an image.');
                const animated = contentType === 'image/gif';
                const emojis = [...message.guild.emojis.cache.values()];
                if (animated && emojis.filter(emoji => emoji.animated).length >= message.guild.emojiLimit) {
                    return warn(message, 'This server cannot have new animated emojis anymore');
                }
                if (!animated && emojis.filter(emoji => !emoji.animated).length >= message.guild.emojiLimit) {
                    return warn(message, 'This server cannot have new static emojis anymore');
                }
                const name = args.join(' ').trim();
                if (name && name.length > 32) return warn(message, 'Emoji name is too long');
                if (!name) return warn(message, 'Usage: `emoji add <name>`');
                try {
                    const emoji = await message.guild.emojis.create({ attachment: bytes, name, reason: `Emoji added by ${message.author}` });
                    return approve(message, `Added ${emoji} as **[${emoji.name}](${emoji.url})**`);
                } catch (err) {
                    return warn(message, `An error occurred while trying to add the emoji\n\`\`\`${err.message}\`\`\``);
                }
            }
        },
        steal: {
            aliases: [],
            data: { name: 'emoji steal', description: 'Steal an emoji from another server', usage: ',emoji steal <emoji> [name]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const target = args[0];
                const name = args.slice(1).join(' ').trim();

                if (message.reference) {
                    const refMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
                    if (refMessage) {
                        const match = /<(a?):(\w+):(\d+)>/.exec(refMessage.content);
                        if (match) {
                            const emojiName = match[2];
                            const url = `https://cdn.discordapp.com/emojis/${match[3]}.${refMessage.content.startsWith('<a') ? 'gif' : 'png'}`;
                            const bytes = await fetchBytes(url);
                            if (!bytes) return warn(message, 'You have reached the emoji limit for this server');
                            if (!checkEmojiBucket(message.guild.id)) return warn(message, 'Guild got rate limited for adding emojis. Try again **in the next hour**');
                            try {
                                const created = await message.guild.emojis.create({ attachment: bytes, name: emojiName, reason: `Emoji added by ${message.author}` });
                                return approve(message, `Added ${created} as **[${emojiName}](${url})**`);
                            } catch (err) {
                                return warn(message, 'You have reached the emoji limit for this server');
                            }
                        }
                    }
                }

                if (!target) return sendCard(message, module.exports.subs.steal);

                if (/^https?:\/\//.test(target)) {
                    const bytes = await fetchBytes(target);
                    if (!bytes) return warn(message, 'Invalid emoji provided');
                    if (!checkEmojiBucket(message.guild.id)) return warn(message, 'Guild got rate limited for adding emojis. Try again **in the next hour**');
                    try {
                        const created = await message.guild.emojis.create({ attachment: bytes, name: name || 'new_emoji', reason: `Emoji added by ${message.author}` });
                        return approve(message, `Added ${created} as **[${name || 'new_emoji'}](${created.url})**`);
                    } catch (err) {
                        return warn(message, 'You have reached the emoji limit for this server');
                    }
                }

                const parsed = parseEmoji(target);
                if (!parsed) return warn(message, 'Invalid emoji provided');
                const url = emojiUrl(parsed);
                const bytes = await fetchBytes(url);
                if (!bytes) return warn(message, 'Invalid emoji provided');
                if (!checkEmojiBucket(message.guild.id)) return warn(message, 'Guild got rate limited for adding emojis. Try again **in the next hour**');
                try {
                    const created = await message.guild.emojis.create({ attachment: bytes, name: name || parsed.name, reason: `Emoji added by ${message.author}` });
                    return approve(message, `Added ${created} as **[${name || parsed.name}](${url})**`);
                } catch (err) {
                    return warn(message, 'You have reached the emoji limit for this server');
                }
            }
        },
        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'emoji remove', description: 'Remove an emoji from the server', usage: ',emoji remove <emoji>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const emoji = guildEmoji(message, args[0]);
                if (!emoji) return warn(message, 'Usage: `emoji remove <emoji>`');
                await emoji.delete(`Emoji deleted by ${message.author}`).catch(() => {});
                return approve(message, 'Deleted the emoji');
            }
        },
        rename: {
            aliases: [],
            data: { name: 'emoji rename', description: 'Rename an emoji', usage: ',emoji rename <emoji> <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const emoji = guildEmoji(message, args[0]);
                const name = args.slice(1).join(' ').trim();
                if (!emoji || !name) return warn(message, 'Usage: `emoji rename <emoji> <name>`');
                if (name.length > 32) return warn(message, 'Emoji name is too long');
                if (!/^[a-zA-Z0-9_]+$/.test(name)) {
                    return warn(message, 'Invalid emoji name. Only alphanumeric characters and underscores are allowed.');
                }
                await emoji.edit({ name, reason: `Emoji renamed by ${message.author}` });
                return approve(message, `Renamed the emoji (${emoji}) to **${name}**`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'emoji list', description: 'Returns a list of emojis in this server', usage: ',emoji list' },
            execute: async (message) => {
                const emojis = [...message.guild.emojis.cache.values()];
                if (!emojis.length) return warn(message, 'No emojis found for this server');
                const lines = emojis.map(emoji => `${emoji} - ${emoji.name} (\`${emoji.id}\`)`);
                return paginate(message, lines, `Emojis (${emojis.length})`, { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        },
        info: {
            aliases: [],
            data: { name: 'emoji info', description: 'Information about an emoji', usage: ',emoji info <emoji>' },
            execute: async (message, args) => {
                const token = args[0];
                if (!token) return warn(message, 'Usage: `emoji info <emoji>`');
                const parsed = parseEmoji(token) || (() => {
                    const guildEmoji = message.guild.emojis.cache.get(String(token).replace(/[<@>]/g, ''));
                    return guildEmoji ? { animated: guildEmoji.animated, name: guildEmoji.name, id: guildEmoji.id } : null;
                })();
                if (!parsed) return warn(message, 'Usage: `emoji info <emoji>`');
                const url = emojiUrl(parsed);
                const embed = createEmbed({ color: COLORS.NEUTRAL, title: parsed.name, url, timestamp: false });
                embed.setThumbnail(url);
                embed.addFields(
                    { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                    { name: 'Markdown', value: `\`\`\`<${parsed.animated ? 'a' : ''}:${parsed.name}:${parsed.id}>\`\`\``, inline: false }
                );
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Download').setURL(url)
                );
                return message.reply({ embeds: [embed], components: [row] });
            }
        },
        enlarge: {
            aliases: [],
            data: { name: 'emoji enlarge', description: 'Gets an image version of your emoji', usage: ',emoji enlarge <emoji>' },
            execute: async (message, args, client) => require('../utility/enlarge').execute(message, args, client)
        },
        search: {
            aliases: [],
            data: { name: 'emoji search', description: 'Search emojis based by query', usage: ',emoji search <query>' },
            execute: async (message, args) => {
                const query = args.join(' ').trim();
                if (!query) return warn(message, 'Usage: `emoji search <query>`');
                const emojis = [...message.client.emojis.cache.values()]
                    .filter(emoji => emoji.name.toLowerCase().includes(query.toLowerCase()))
                    .map(emoji => `${emoji} \`${emoji.id}\` - ${emoji.name}`);
                if (!emojis.length) return warn(message, 'No emojis found');
                return paginate(message, emojis, `Emojis containing ${query} (${emojis.length})`);
            }
        },
        zip: {
            aliases: [],
            data: { name: 'emoji zip', description: 'Send a zip file of all emojis in the server', usage: ',emoji zip' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const files = [];
                const used = new Set();
                for (const emoji of message.guild.emojis.cache.values()) {
                    const extension = emoji.animated ? 'gif' : 'png';
                    const base = emoji.name;
                    let fileName = `${base}.${extension}`;
                    let counter = 1;
                    while (used.has(fileName)) {
                        fileName = `${base}_${counter}.${extension}`;
                        counter++;
                    }
                    used.add(fileName);
                    const data = await fetchBytes(emoji.url);
                    if (data) files.push({ name: fileName, data });
                }
                if (!files.length) return warn(message, 'No emojis found for this server');
                const zip = buildZip(files);
                return message.reply({ files: [{ attachment: zip, name: `emojis-${message.guild.name}.zip` }] });
            }
        },
        addmulti: {
            aliases: ['am'],
            data: { name: 'emoji addmulti', description: 'Add multiple emojis at the same time', usage: ',emoji addmulti <emojis>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const parsed = args.map(parseEmoji).filter(Boolean);
                if (!parsed.length) return warn(message, 'Usage: `emoji addmulti <emojis>`');
                if (parsed.length > 30) return warn(message, 'Do not add more than 10 emojis at once');
                const sent = await message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `${message.author}: Adding **${parsed.length}** emojis...` })] });
                const created = [];
                for (const emoji of parsed) {
                    if (!checkEmojiBucket(message.guild.id)) {
                        if (created.length) break;
                        return warn(message, 'Guild got rate limited for adding emojis. Try again **in the next hour**');
                    }
                    const bytes = await fetchBytes(emojiUrl(emoji));
                    if (!bytes) continue;
                    try {
                        const item = await message.guild.emojis.create({ attachment: bytes, name: emoji.name, reason: `Emoji created by ${message.author}` });
                        created.push(`${item}`);
                    } catch (err) {
                        break;
                    }
                }
                return sent.edit({ embeds: [createEmbed({ color: COLORS.NEUTRAL, title: `Added ${created.length} emojis`, description: created.join('') })] });
            }
        },
        sticker: {
            aliases: [],
            data: { name: 'emoji sticker', description: 'Convert a custom emoji to a sticker', usage: ',emoji sticker <emoji> <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const parsed = guildEmoji(message, args[0]);
                const name = args.slice(1).join(' ').trim();
                if (!parsed || !name) return warn(message, 'Usage: `emoji sticker <emoji> <name>`');
                if (message.guild.stickers.cache.size >= message.guild.stickerLimit) {
                    return warn(message, 'This server cannot have new stickers anymore');
                }
                if (name.length > 32) return warn(message, 'Sticker name is too long');
                const data = await fetchBytes(parsed.url);
                if (!data) return warn(message, 'Failed to fetch emoji image.');
                let file = data;
                if (!parsed.animated) {
                    try {
                        file = await resizePng(data, 512);
                    } catch (err) {
                        return warn(message, 'Failed to fetch emoji image.');
                    }
                }
                try {
                    const sticker = await message.guild.stickers.create({ name, description: name, tags: '🖼️', file, reason: `Sticker created by ${message.author}` });
                    return approve(message, `Added [**sticker**](${sticker.url}) with the name **${name}**`);
                } catch (err) {
                    return warn(message, 'An error occurred while creating the sticker');
                }
            }
        }
    },
    firstSticker
};
