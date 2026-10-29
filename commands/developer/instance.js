const { PermissionFlagsBits, Routes, ActivityType } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { getBytes } = require('../../utils/social');

function authorize(message, client) {
    const row = first('SELECT owner_id FROM instance WHERE user_id = ?', client.user.id);
    if (!row) return { ok: false, reason: 'You can only use this command on a instance' };
    if (String(row.owner_id) !== message.author.id) return { ok: false, reason: 'You are not **authorized** to use this command' };
    return { ok: true, row };
}

function resolveImage(message) {
    const attachment = message.attachments.first();
    if (attachment) return attachment.url;
    const url = message.content ? (message.content.split(/\s+/).find(part => /^https?:\/\//i.test(part)) || null) : null;
    return url;
}

async function fetchImage(url) {
    if (!/^https?:\/\//i.test(url)) return null;
    return getBytes(url);
}

module.exports = {
    permission: "Instance Owner",
    data: { name: 'instance', description: 'Instance commands', usage: ',instance <avatar|banner|status|description|whitelist>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['avatar', 'banner', 'status', 'description', 'whitelist'],
    subUsages: {
        avatar: ',instance avatar <url|none>',
        banner: ',instance banner <url|none>',
        status: ',instance status <text>',
        description: ',instance description <text|none>',
        whitelist: ',instance whitelist <invite>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        avatar: {
            aliases: [],
            data: { name: 'instance avatar', description: 'Change avatar of your bot instance', usage: ',instance avatar <url|none>' },
            execute: async (message, args, client) => {
                const gate = authorize(message, client);
                if (!gate.ok) return warn(message, gate.reason);
                if (args[0] === 'none') {
                    try {
                        await client.user.setAvatar(null);
                        return approve(message, 'Bot avatar has been successfully removed!');
                    } catch (err) {
                        return warn(message, `An error occurred while changing the avatar\n \`\`\`${err.message}\`\`\``);
                    }
                }
                const url = resolveImage(message);
                if (!url) return warn(message, 'Usage: `instance avatar <url>`');
                const bytes = await fetchImage(url);
                if (!bytes) return warn(message, 'The image provided is not a valid URL');
                try {
                    await client.user.setAvatar(bytes);
                    return approve(message, 'Bot avatar has been successfully updated!');
                } catch (err) {
                    return warn(message, `An error occurred while changing the avatar\n \`\`\`${err.message}\`\`\``);
                }
            }
        },
        banner: {
            aliases: [],
            data: { name: 'instance banner', description: 'Change banner of your bot instance', usage: ',instance banner <url|none>' },
            execute: async (message, args, client) => {
                const gate = authorize(message, client);
                if (!gate.ok) return warn(message, gate.reason);
                if (args[0] === 'none') {
                    try {
                        await client.rest.patch(Routes.user(), { body: { banner: null } });
                        return approve(message, 'Bot banner has been successfully removed!');
                    } catch (err) {
                        return warn(message, `An error occurred while changing the banner\n \`\`\`${err.message}\`\`\``);
                    }
                }
                const url = resolveImage(message);
                if (!url) return warn(message, 'Usage: `instance banner <url>`');
                const bytes = await fetchImage(url);
                if (!bytes) return warn(message, 'The image provided is not a valid URL');
                try {
                    await client.rest.patch(Routes.user(), { body: { banner: `data:image/png;base64,${bytes.toString('base64')}` } });
                    return approve(message, 'Bot banner has been successfully updated!');
                } catch (err) {
                    return warn(message, `An error occurred while changing the banner\n \`\`\`${err.message}\`\`\``);
                }
            }
        },
        status: {
            aliases: [],
            data: { name: 'instance status', description: 'Change status of your bot instance', usage: ',instance status <text>' },
            execute: async (message, args, client) => {
                const gate = authorize(message, client);
                if (!gate.ok) return warn(message, gate.reason);
                const status = args.join(' ').trim();
                if (!status) return warn(message, 'Usage: `instance status <text>`');
                if (status.length > 25) return warn(message, 'Status should be less than 25 characters');
                client.user.setPresence({ activities: [{ name: status, type: ActivityType.Custom }] });
                try { run('UPDATE instance SET status = ? WHERE user_id = ?', status, client.user.id); } catch (err) { }
                return approve(message, `Bot status has been successfully updated to:\n\`\`\`${status}\`\`\``);
            }
        },
        description: {
            aliases: ['bio'],
            data: { name: 'instance description', description: 'Change description of your bot instance', usage: ',instance description <text|none>' },
            execute: async (message, args, client) => {
                const gate = authorize(message, client);
                if (!gate.ok) return warn(message, gate.reason);
                const description = args.join(' ').trim();
                if (!description) return warn(message, 'Usage: `instance description <text>`');
                if (description === 'none') {
                    try {
                        await client.application.edit({ description: ' ' });
                        return approve(message, 'Bot description has been successfully removed!');
                    } catch (err) {
                        return warn(message, `An error occurred while changing the description\n \`\`\`${err.message}\`\`\``);
                    }
                }
                if (description.length > 400) return warn(message, 'Description should be less than 400 characters');
                try {
                    await client.application.edit({ description });
                    return approve(message, `Bot description has been successfully updated to:\n\`\`\`${description}\`\`\``);
                } catch (err) {
                    return warn(message, `An error occurred while changing the description\n \`\`\`${err.message}\`\`\``);
                }
            }
        },
        whitelist: {
            aliases: [],
            data: { name: 'instance whitelist', description: "Whitelist a server using a product key", usage: ',instance whitelist <invite>' },
            execute: async (message, args, client) => {
                const gate = authorize(message, client);
                if (!gate.ok) return warn(message, gate.reason);
                const code = args[0] ? String(args[0]).replace(/^https?:\/\/(www\.)?discord\.gg\//i, '').replace(/^https?:\/\/discord\.com\/invite\//i, '').split(/[/?#]/)[0] : null;
                if (!code) return warn(message, 'Usage: `instance whitelist <invite>`');
                const invite = await client.fetchInvite(code).catch(() => null);
                if (!invite || !invite.guild) return warn(message, 'That invite is invalid or expired');
                const guildName = invite.guild.name;
                if (first('SELECT 1 AS ok FROM instance_addon WHERE guild_id = ?', invite.guild.id)) {
                    return warn(message, `Instance **${client.user}** is already in ${guildName}`);
                }
                run('INSERT INTO instance_addon (shard_id, guild_id) VALUES (?, ?)', 0, invite.guild.id);
                return approve(message, `Instance **${client.user}** has been successfully added to ${guildName}`);
            }
        }
    }
};
