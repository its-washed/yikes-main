const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { getBytes } = require('../../utils/social');

const URL_REGEX = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\((?:[^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\([^\s()<>]+|\([^\s()<>]+\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i;

async function resolveUrl(message, args) {
    let url = args.join(' ').trim();
    if (!url) {
        const attachment = message.attachments.first();
        if (!attachment) return { error: 'Provide an image URL or attach an image' };
        url = attachment.url;
    }
    if (!URL_REGEX.test(url)) return { error: 'The image provided is not a valid URL' };
    const bytes = await getBytes(url);
    if (!bytes) return { error: 'Failed to download the image' };
    if (bytes.length > 10 * 1024 * 1024) return { error: 'The image provided is larger than 10 MB' };
    return { url, bytes };
}

module.exports = {
    permission: "manage guild",
    data: { name: 'set', description: 'Modify your server with evelina', usage: ',set <name|icon|banner|splash>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['name', 'icon', 'banner', 'splash'],
    subUsages: {
        name: ',set name evelina',
        icon: ',set icon https://evelina.bot/icon.png',
        banner: ',set banner https://evelina.bot/icon.png',
        splash: ',set splash https://evelina.bot/icon.png'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        name: {
            aliases: [],
            data: { name: 'set name', description: "Change your server's name", usage: ',set name evelina' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name\n> Usage: `,set name evelina`');
                if (name.length > 100) return warn(message, "Server names can't be over **100 characters**");
                const old = message.guild.name;
                try {
                    await message.guild.edit({ name });
                } catch (err) {
                    return warn(message, `Failed to change the server name\n\`\`\`${err.message}\`\`\``);
                }
                return approve(message, `Changed **${old}**'s name`);
            }
        },
        icon: {
            aliases: ['picture', 'pic'],
            data: { name: 'set icon', description: "Change your server's icon", usage: ',set icon https://evelina.bot/icon.png' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const result = await resolveUrl(message, args);
                if (result.error) return warn(message, result.error);
                try {
                    await message.guild.edit({ icon: result.bytes });
                } catch (err) {
                    return warn(message, `Invalid **media type**\n\`\`\`${err.message}\`\`\``);
                }
                return approve(message, `Set the server icon to [\`Attachment\`](${result.url})`);
            }
        },
        banner: {
            aliases: [],
            data: { name: 'set banner', description: "Change your server's banner", usage: ',set banner https://evelina.bot/icon.png' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (message.guild.premiumTier < 2) {
                    return warn(message, "You haven't **unlocked** banners, you need at least **level 2**");
                }
                const result = await resolveUrl(message, args);
                if (result.error) return warn(message, result.error);
                try {
                    await message.guild.edit({ banner: result.bytes });
                } catch (err) {
                    return warn(message, `Invalid **media type**\n\`\`\`${err.message}\`\`\``);
                }
                return approve(message, `Set the server banner to [\`Attachment\`](${result.url})`);
            }
        },
        splash: {
            aliases: [],
            data: { name: 'set splash', description: "Change your server's splash", usage: ',set splash https://evelina.bot/icon.png' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (message.guild.premiumTier < 1) {
                    return warn(message, "You haven't **unlocked** splash");
                }
                const result = await resolveUrl(message, args);
                if (result.error) return warn(message, result.error);
                try {
                    await message.guild.edit({ splash: result.bytes });
                } catch (err) {
                    return warn(message, `Invalid **media type**\n\`\`\`${err.message}\`\`\``);
                }
                return approve(message, `Set the server splash to [\`Attachment\`](${result.url})`);
            }
        }
    }
};
