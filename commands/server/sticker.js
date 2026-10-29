const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { fetchBytes, resizePng, buildZip } = require('../../utils/emojiTools');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { firstSticker } = require('./emoji');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function stickerFromContext(message) {
    const sticker = await firstSticker(message);
    if (!sticker) return null;
    return sticker;
}

module.exports = {
    data: { name: 'sticker', description: "Manage server's stickers", usage: ',sticker <add|steal|rename|enlarge|delete|zip|tag|emoji>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'steal', 'rename', 'enlarge', 'delete', 'zip', 'tag', 'emoji'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, steal, rename, enlarge, delete, zip, tag, emoji');
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'sticker add', description: 'Add a sticker with an image attachment', usage: ',sticker add <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `sticker add <name>`');
                if (message.guild.stickers.cache.size >= message.guild.stickerLimit) {
                    return warn(message, 'This server cannot have new stickers anymore');
                }
                if (name.length > 32) return warn(message, 'Sticker name is too long');
                const attachments = message.attachments.size
                    ? [...message.attachments.values()]
                    : (message.reference && message.reference.resolved ? [...message.reference.resolved.attachments.values()] : []);
                if (!attachments.length) return warn(message, 'Please attach an image to use as a sticker.');
                const attachment = attachments[0];
                const contentType = String(attachment.contentType || '');
                if (!contentType.startsWith('image/')) return warn(message, 'Attached file must be an image.');
                const bytes = await fetchBytes(attachment.url);
                if (!bytes) return warn(message, 'Attached file must be an image.');
                let file = bytes;
                try {
                    file = await resizePng(bytes, 512);
                } catch (err) {
                    return warn(message, 'Attached file must be an image.');
                }
                try {
                    const sticker = await message.guild.stickers.create({ name, description: name, tags: '🖼️', file, reason: `Sticker created by ${message.author}` });
                    return approve(message, `Added [**sticker**](${sticker.url}) with the name **${name}**`);
                } catch (err) {
                    return warn(message, `An error occurred while adding the sticker:\n \`\`\`${err.message}\`\`\``);
                }
            }
        },
        steal: {
            aliases: [],
            data: { name: 'sticker steal', description: 'Steal a sticker from another server', usage: ',sticker steal [name]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (message.guild.stickers.cache.size >= message.guild.stickerLimit) {
                    return warn(message, 'This server cannot have new stickers anymore');
                }
                let name = args.join(' ').trim() || null;
                if (name && name.length > 32) return warn(message, 'Sticker name is too long');
                try {
                    const sticker = await stickerFromContext(message);
                    if (!sticker) return warn(message, 'Sticker not found. Please provide a message containing a sticker or reply to one.');
                    const data = await fetchBytes(sticker.url);
                    if (!data) return warn(message, 'Sticker data is empty or unreadable');
                    if (!name) name = sticker.name;
                    const created = await message.guild.stickers.create({
                        name,
                        description: name,
                        tags: '🖼️',
                        file: data,
                        reason: `sticker created by ${message.author}`
                    });
                    return approve(message, `Added [**sticker**](${created.url}) with the name **${name}**`);
                } catch (err) {
                    return warn(message, 'An error occurred while adding the sticker');
                }
            }
        },
        rename: {
            aliases: [],
            data: { name: 'sticker rename', description: 'Rename a sticker', usage: ',sticker rename <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `sticker rename <name>`');
                if (name.length > 32) return warn(message, 'Sticker name is too long');
                try {
                    const sticker = await stickerFromContext(message);
                    if (!sticker) return warn(message, 'Sticker not found. Please provide a valid sticker');
                    const full = await sticker.fetch();
                    if (!full.guild || full.guild.id !== message.guild.id) return warn(message, 'This sticker is not from this server');
                    await full.edit({ name, reason: `Sticker renamed by ${message.author}` });
                    return approve(message, `Renamed the sticker (${sticker.name}) to **${name}**`);
                } catch (err) {
                    return warn(message, 'An error occurred while renaming the sticker');
                }
            }
        },
        enlarge: {
            aliases: ['e', 'jumbo'],
            data: { name: 'sticker enlarge', description: 'Returns a sticker as a file', usage: ',sticker enlarge' },
            execute: async (message) => {
                try {
                    const sticker = await stickerFromContext(message);
                    if (!sticker) return warn(message, 'Sticker not found or accessible.');
                    const data = await fetchBytes(sticker.url);
                    if (!data) return warn(message, 'Sticker not found or accessible.');
                    const extension = sticker.format && sticker.format.name === 'apng' ? 'apng' : 'png';
                    return message.reply({ files: [{ attachment: data, name: `${sticker.name}.${extension}` }] });
                } catch (err) {
                    return warn(message, 'Could not find the sticker asset');
                }
            }
        },
        delete: {
            aliases: [],
            data: { name: 'sticker delete', description: 'Delete a sticker', usage: ',sticker delete [name]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                try {
                    const name = args.join(' ').trim();
                    if (name) {
                        const sticker = message.guild.stickers.cache.find(entry => entry.name === name);
                        if (!sticker) return warn(message, `Could not find a sticker with the name \`${name}\``);
                        await sticker.delete(`Sticker deleted by ${message.author}`);
                        return approve(message, `Deleted the sticker **${sticker.name}**`);
                    }
                    const sticker = await stickerFromContext(message);
                    if (!sticker) return warn(message, 'Sticker not found. Please provide a valid sticker');
                    const full = await sticker.fetch();
                    if (!full.guild || full.guild.id !== message.guild.id) return warn(message, 'This sticker is not from this server');
                    await full.delete(`Sticker deleted by ${message.author}`);
                    return approve(message, `Deleted the sticker **${full.name}**`);
                } catch (err) {
                    return warn(message, 'Sticker not found. It may have already been deleted');
                }
            }
        },
        zip: {
            aliases: [],
            data: { name: 'sticker zip', description: "Send a zip file containing the server's stickers", usage: ',sticker zip' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const files = [];
                for (const sticker of message.guild.stickers.cache.values()) {
                    const data = await fetchBytes(sticker.url);
                    if (data) files.push({ name: `${sticker.name}.png`, data });
                }
                if (!files.length) return warn(message, 'No stickers found for this server');
                const zip = buildZip(files);
                return message.reply({ files: [{ attachment: zip, name: `stickers-${message.guild.name}.zip` }] });
            }
        },
        tag: {
            aliases: [],
            data: { name: 'sticker tag', description: "Add your server's vanity URL to the end of sticker names", usage: ',sticker tag' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                const code = message.guild.vanityURLCode;
                if (!code) return warn(message, 'There is no **vanity url** set');
                const vanity = `gg/${code}`;
                const sent = await message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `Adding or updating **${vanity}** to \`${message.guild.stickers.cache.size}\` stickers...` })] });
                for (const sticker of message.guild.stickers.cache.values()) {
                    const parts = sticker.name.split(' | ')
                        .map(part => part.split(' gg/')[0].split(' .gg/')[0].trim())
                        .filter(part => !part.includes('gg/'));
                    const updated = `${parts.join(' | ').trim()} | ${vanity}`;
                    await sticker.edit({ name: updated.slice(0, 30) }).catch(() => {});
                    await sleep(1500);
                }
                await sent.delete().catch(() => {});
                return approve(message, `Updated stickers with **${vanity}** in server stickers`);
            }
        },
        emoji: {
            aliases: [],
            data: { name: 'sticker emoji', description: 'Convert a sticker to a custom emoji and optionally attach it to a message', usage: ',sticker emoji [name]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageGuildExpressions)) return;
                let name = args.join(' ').trim() || null;
                if (name && name.length > 32) return warn(message, 'Emoji name is too long');
                try {
                    const sticker = await stickerFromContext(message);
                    if (!sticker) return warn(message, 'Could not retrieve sticker');
                    const data = await fetchBytes(sticker.url);
                    if (!data) return warn(message, 'Sticker data is empty or unreadable');
                    if (!name) name = sticker.name;
                    let emojiBytes;
                    try {
                        emojiBytes = await resizePng(data, 128);
                    } catch (err) {
                        return warn(message, 'An error occurred while creating the emoji');
                    }
                    const emoji = await message.guild.emojis.create({ attachment: emojiBytes, name, reason: `Emoji created by ${message.author}` });
                    return approve(message, `Added ${emoji} as **[${emoji.name}](${emoji.url})**`);
                } catch (err) {
                    return warn(message, 'An error occurred while creating the emoji');
                }
            }
        }
    }
};
