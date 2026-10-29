const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

function moduleRow(guildId) {
    return first('SELECT suggestion FROM modules WHERE guild_id = ?', guildId);
}

function needEnabled(message, guildId) {
    const check = moduleRow(guildId);
    if (!check || !check.suggestion) {
        warn(message, 'Suggestion module is **not** enabled\n> Use `,suggestion enable` to enable it');
        return false;
    }
    return true;
}

function resolveUser(message, client, token) {
    if (!token) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned && (token === mentioned.toString() || token === `<@!${mentioned.id}>`)) return mentioned;
    const bare = String(token).replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(bare)) return client.users.cache.get(bare) || null;
    return null;
}

module.exports = {
    permission: "Manage guild",
    data: { name: 'suggestion', description: 'Suggestion commands', usage: ',suggestion <enable|disable|channel|role|blacklist|unblacklist|blacklisted|thread>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'channel', 'role', 'blacklist', 'unblacklist', 'blacklisted', 'thread'],
    subUsages: {
        enable: ',suggestion enable',
        disable: ',suggestion disable',
        channel: ',suggestion channel #channel',
        role: ',suggestion role @role',
        blacklist: ',suggestion blacklist <user> <reason>',
        unblacklist: ',suggestion unblacklist <user>',
        blacklisted: ',suggestion blacklisted',
        thread: ',suggestion thread'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            aliases: [],
            data: { name: 'suggestion enable', description: 'Enable the suggestion module', usage: ',suggestion enable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = moduleRow(message.guild.id);
                if (check && check.suggestion) {
                    return warn(message, 'Suggestion module is **already** enabled\n> Use `,suggestion disable` to disable it');
                }
                run('INSERT INTO modules (guild_id, suggestion) VALUES (?, TRUE) ON CONFLICT (guild_id) DO UPDATE SET suggestion = TRUE', message.guild.id);
                return approve(message, 'Suggestion module has been **enabled** for this server');
            }
        },
        disable: {
            aliases: [],
            data: { name: 'suggestion disable', description: 'Disable the suggestion module', usage: ',suggestion disable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = moduleRow(message.guild.id);
                if (!check || !check.suggestion) {
                    return warn(message, 'Suggestion module is **not** enabled\n> Use `,suggestion enable` to enable it');
                }
                return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: Are you sure you want to **disable** suggestion`,
                    async (i) => {
                        run('INSERT INTO modules (guild_id, suggestion) VALUES (?, FALSE) ON CONFLICT (guild_id) DO UPDATE SET suggestion = FALSE', i.guild.id);
                        return i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: Suggestion module has been **disabled** in this server` }], components: [] });
                    },
                    async (i) => {
                        return i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: Suggestion deactivation got canceled` }], components: [] });
                    });
            }
        },
        channel: {
            aliases: [],
            data: { name: 'suggestion channel', description: 'Set the suggestion channel', usage: ',suggestion channel #channel' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'Usage: `suggestion channel #channel`');
                run('INSERT INTO suggestions_module (guild_id, channel_id) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET channel_id = ?',
                    message.guild.id, channel.id, channel.id);
                return approve(message, `Suggestion channel has been set to ${channel.toString()}`);
            }
        },
        role: {
            aliases: [],
            data: { name: 'suggestion role', description: 'Set the suggestion role', usage: ',suggestion role @role' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const role = message.mentions.roles.first();
                if (!role) return warn(message, 'Usage: `suggestion role @role`');
                run('INSERT INTO suggestions_module (guild_id, role_id) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET role_id = ?',
                    message.guild.id, role.id, role.id);
                return approve(message, `Suggestion role has been set to ${role.toString()}`);
            }
        },
        blacklist: {
            aliases: [],
            data: { name: 'suggestion blacklist', description: 'Blacklist a member from creating suggestions', usage: ',suggestion blacklist <user> <reason>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const token = args[0];
                const user = resolveUser(message, client, token);
                const reason = args.slice(1).join(' ').trim();
                if (!user || !reason) return warn(message, 'Usage: `suggestion blacklist <user> <reason>`');
                const ownerId = client.application && client.application.owner ? (client.application.owner.id || null) : null;
                if (ownerId && user.id === ownerId) return warn(message, "Don't blacklist a bot owner, are you sure?");
                try {
                    run('INSERT INTO suggestions_blacklist (guild_id, user_id, reason) VALUES (?, ?, ?)', message.guild.id, user.id, reason);
                    return approve(message, `Blacklisted ${user.toString()} from creating suggestions for reason: **${reason}**`);
                } catch {
                    return warn(message, `User ${user.toString()} is **already** blacklisted from creating suggestions`);
                }
            }
        },
        unblacklist: {
            aliases: [],
            data: { name: 'suggestion unblacklist', description: 'Unblacklist a member from creating suggestions', usage: ',suggestion unblacklist <user>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const token = args[0];
                const user = resolveUser(message, client, token);
                if (!user) return warn(message, 'Usage: `suggestion unblacklist <user>`');
                const ownerId = client.application && client.application.owner ? (client.application.owner.id || null) : null;
                if (ownerId && user.id === ownerId) return warn(message, "Don't unblacklist a bot owner, are you sure?");
                const result = first('SELECT 1 AS ok FROM suggestions_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
                if (!result) return warn(message, `${user.toString()} isn't blacklisted from creating suggestions`);
                run('DELETE FROM suggestions_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
                return approve(message, `Unblacklisted ${user.toString()} from creating suggestions`);
            }
        },
        blacklisted: {
            aliases: [],
            data: { name: 'suggestion blacklisted', description: 'List all blacklisted users from creating suggestions', usage: ',suggestion blacklisted' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const results = query('SELECT user_id, reason FROM suggestions_blacklist WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'No suggestion blacklisted user found');
                const lines = results.map(r => {
                    const user = message.client.users.cache.get(String(r.user_id));
                    return `**${user ? user.tag : 'Unknown'}** (\`${r.user_id}\`)\n${EMOJIS.REPLY} **Reason:** ${r.reason}`;
                });
                return paginate(message, lines, 'Suggestion Blacklisted',
                    { name: message.author.tag, icon_url: message.author.displayAvatarURL() });
            }
        },
        thread: {
            aliases: [],
            data: { name: 'suggestion thread', description: 'Enable/Disable thread creation for suggestions', usage: ',suggestion thread' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needEnabled(message, message.guild.id)) return;
                const row = first('SELECT threads FROM suggestions_module WHERE guild_id = ?', message.guild.id);
                if (!row) return warn(message, 'Suggestions module is not configured for this server.');
                if (row.threads) {
                    run('UPDATE suggestions_module SET threads = FALSE WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Thread creation for suggestions has been **disabled**');
                }
                run('UPDATE suggestions_module SET threads = TRUE WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Thread creation for suggestions has been **enabled**');
            }
        }
    }
};
