const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, resolveColor, Colors } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, prefix, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { needBoosterConfigured, needBoosterRole, notBoosterBlacklisted, needBoostedTo } = require('../../utils/predicates');
const { humanizeRole, newRole } = require('../../utils/roleGuard');
const { isDeveloper } = require('../../utils/developer');
const { COLORS, EMOJIS } = require('../../utils/styles');

let CSS_NAMES = {};
try { CSS_NAMES = require('color-name'); } catch (err) {}

function getBannedWords(guildId) {
    const row = first('SELECT banned_words FROM booster_module WHERE guild_id = ?', guildId);
    if (!row || !row.banned_words) return [];
    try {
        const parsed = JSON.parse(row.banned_words);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function saveBannedWords(guildId, words) {
    run('UPDATE booster_module SET banned_words = ? WHERE guild_id = ?', JSON.stringify(words), guildId);
}

function containsBannedWord(words, text) {
    const lower = String(text || '').toLowerCase();
    return words.some(word => word && lower.includes(word));
}

function parseColor(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const build = input => {
        const value = resolveColor(input);
        if (value < 0 || value > 0xffffff) return null;
        return { value, hex: `#${value.toString(16).toUpperCase().padStart(6, '0')}` };
    };
    try {
        const parsed = build(raw);
        if (parsed) return parsed;
    } catch (err) {}

    if (CSS_NAMES[raw.toLowerCase()]) {
        const hex = CSS_NAMES[raw.toLowerCase()];
        const value = (hex[0] << 16) + (hex[1] << 8) + hex[2];
        return { value, hex: `#${value.toString(16).toUpperCase().padStart(6, '0')}` };
    }
    const key = Object.keys(Colors).find(k => k.toLowerCase() === raw.toLowerCase());
    if (key) {
        try {
            return build(key);
        } catch (err) {
            return null;
        }
    }
    return null;
}

function resolveMember(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.members.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return null;
}

function resolveUser(message, text) {
    const member = resolveMember(message, text);
    if (member) return member.user;
    const raw = String(text || '').trim();
    if (/^\d{17,20}$/.test(raw)) return message.client.users.cache.get(raw) || null;
    return null;
}

function parseShared(row) {
    if (!row || !row.shared_users) return [];
    if (Array.isArray(row.shared_users)) return row.shared_users;
    try {
        const parsed = JSON.parse(row.shared_users);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

async function fetchImage(url) {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
}

async function resolveIconSource(message, args) {
    const text = args.join(' ').trim();
    if (text) {
        const custom = /^<a?:[A-Za-z0-9_]+:(\d{17,20})>$/.exec(text);
        if (custom) return fetchImage(`https://cdn.discordapp.com/emojis/${custom[1]}.png`);
        if (/^https?:\/\//i.test(text)) return fetchImage(text);
        return undefined;
    }
    const attachment = message.attachments.first();
    if (attachment && attachment.contentType && attachment.contentType.startsWith('image')) {
        return fetchImage(attachment.url);
    }
    return null;
}

function memberLabel(guild, userId) {
    const member = guild.members.cache.get(String(userId));
    if (member) return `${member} (\`${userId}\`)`;
    return `<@!${userId}> (\`${userId}\`)`;
}

async function replyError(message, err) {
    return warn(message, `Something went wrong\n\`\`\`\`${err.message}\`\`\`\``);
}

module.exports = {
    data: { name: 'boosterrole', description: 'Boosterrole Commands', usage: ',boosterrole <blacklist|unblacklist|blacklisted|setup|reset|wipe|award|allow|share|base|limit|create|name|color|icon|delete|list>' },
    aliases: ['br'],
    cooldown: 3,
    subcommands: ['blacklist', 'unblacklist', 'blacklisted', 'setup', 'reset', 'wipe', 'award', 'allow', 'share', 'base', 'limit', 'create', 'name', 'color', 'icon', 'delete', 'list'],
    subUsages: {
        blacklist: ',boosterrole blacklist <word|user>',
        unblacklist: ',boosterrole unblacklist <word|user>',
        blacklisted: ',boosterrole blacklisted <word|user>',
        setup: ',boosterrole setup',
        reset: ',boosterrole reset',
        wipe: ',boosterrole wipe <user>',
        award: ',boosterrole award <add|remove|list>',
        allow: ',boosterrole allow <add|remove|list>',
        share: ',boosterrole share <enable|disable|limit|add|remove|list>',
        base: ',boosterrole base [role]',
        limit: ',boosterrole limit <amount>',
        create: ',boosterrole create <hex> [name]',
        name: ',boosterrole name <name>',
        color: ',boosterrole color <hex>',
        icon: ',boosterrole icon <emoji|url|none>',
        delete: ',boosterrole delete',
        list: ',boosterrole list'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        blacklist: {
            aliases: [],
            data: { name: 'boosterrole blacklist', description: 'Manage the blacklist for boosterrole names/users', usage: ',boosterrole blacklist <word|user>' },
            subcommands: ['word', 'user'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.blacklist);
            },
            subs: {
                word: {
                    aliases: [],
                    data: { name: 'boosterrole blacklist word', description: 'Blacklist a word that can no longer be used as a Boosterrole name', usage: ',boosterrole blacklist word <words>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const words = args.join(' ').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
                        if (!words.length) return warn(message, 'You must provide at least one word');
                        const banned = getBannedWords(message.guild.id);
                        const added = [];
                        for (const word of words) {
                            if (banned.includes(word)) {
                                await warn(message, `Word \`${word}\` is already banned.`);
                            } else {
                                banned.push(word);
                                added.push(word);
                            }
                        }
                        if (added.length) {
                            saveBannedWords(message.guild.id, banned);
                            return approve(message, `Following words have been added:\n> **${added.join(', ')}**`);
                        }
                        return warn(message, 'No new words were added to the banned words list.');
                    }
                },
                user: {
                    aliases: [],
                    data: { name: 'boosterrole blacklist user', description: 'Blacklist a member from using boosterroles', usage: ',boosterrole blacklist user <user> <reason>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const user = resolveUser(message, args[0]);
                        if (!user) return warn(message, 'You must mention a user or provide an id');
                        const reason = args.slice(1).join(' ').trim();
                        if (!reason) return warn(message, 'You must provide a reason');
                        if (isDeveloper(user.id)) return warn(message, "Don't blacklist a bot owner, are you sure?");
                        const existing = first('SELECT 1 AS ok FROM booster_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
                        if (existing) return warn(message, `User <@${user.id}> is **already** blacklisted from using boosterroles`);
                        run('INSERT INTO booster_blacklist (guild_id, user_id, reason) VALUES (?, ?, ?)', message.guild.id, user.id, reason);
                        return approve(message, `Blacklisted <@${user.id}> from using boosterroles for reason: **${reason}**`);
                    }
                }
            }
        },

        unblacklist: {
            aliases: [],
            data: { name: 'boosterrole unblacklist', description: 'Manage the unblacklist for boosterrole names/users', usage: ',boosterrole unblacklist <word|user>' },
            subcommands: ['word', 'user'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.unblacklist);
            },
            subs: {
                word: {
                    aliases: [],
                    data: { name: 'boosterrole unblacklist word', description: 'Unblacklist a word to allow it as a boosterrole name again', usage: ',boosterrole unblacklist word <words>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const words = args.join(' ').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
                        if (!words.length) return warn(message, 'You must provide at least one word');
                        const banned = getBannedWords(message.guild.id);
                        const removed = [];
                        for (const word of words) {
                            const idx = banned.indexOf(word);
                            if (idx === -1) {
                                await warn(message, `Word \`${word}\` is not banned.`);
                            } else {
                                banned.splice(idx, 1);
                                removed.push(word);
                            }
                        }
                        if (removed.length) {
                            saveBannedWords(message.guild.id, banned);
                            return approve(message, `Following words have been removed:\n> **${removed.join(', ')}**`);
                        }
                        return warn(message, 'No words were removed from the banned words list.');
                    }
                },
                user: {
                    aliases: [],
                    data: { name: 'boosterrole unblacklist user', description: 'Unblacklist a member from using boosterroles', usage: ',boosterrole unblacklist user <user>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const user = resolveUser(message, args[0]);
                        if (!user) return warn(message, 'You must mention a user or provide an id');
                        if (isDeveloper(user.id)) return warn(message, "Don't unblacklist a bot owner, are you sure?");
                        const existing = first('SELECT 1 AS ok FROM booster_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
                        if (!existing) return warn(message, `User <@${user.id}> isn't blacklisted from using boosterroles`);
                        run('DELETE FROM booster_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
                        return approve(message, `Unblacklisted <@${user.id}> from using boosterroles`);
                    }
                }
            }
        },

        blacklisted: {
            aliases: [],
            data: { name: 'boosterrole blacklisted', description: 'List all blacklisted words for boosterrole names/users', usage: ',boosterrole blacklisted <word|user>' },
            subcommands: ['word', 'user'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.blacklisted);
            },
            subs: {
                word: {
                    aliases: [],
                    data: { name: 'boosterrole blacklisted word', description: 'Shows all blacklisted words for boosterrole names', usage: ',boosterrole blacklisted word' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const banned = getBannedWords(message.guild.id);
                        if (!banned.length) return warn(message, 'There are no banned words.');
                        const lines = banned.map(word => `**${word}**`);
                        return paginate(message, lines, 'Blacklisted words', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL()
                        });
                    }
                },
                user: {
                    aliases: [],
                    data: { name: 'boosterrole blacklisted user', description: 'List all blacklisted users from using boosterroles', usage: ',boosterrole blacklisted user' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const results = query('SELECT user_id, reason FROM booster_blacklist WHERE guild_id = ?', message.guild.id) || [];
                        const lines = results.map(row => `**${message.client.users.cache.get(String(row.user_id)) || row.user_id}** (\`${row.user_id}\`)\n${EMOJIS.REPLY} **Reason:** ${row.reason}`);
                        if (lines.length) {
                            return paginate(message, lines, 'Boosterrole Blacklisted', {
                                name: String(message.author),
                                icon_url: message.author.displayAvatarURL()
                            });
                        }
                        return warn(message, 'No boosterrole blacklisted user found');
                    }
                }
            }
        },

        setup: {
            aliases: [],
            data: { name: 'boosterrole setup', description: 'Enable Boosterrole system in your server', usage: ',boosterrole setup' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const existing = first('SELECT 1 AS ok FROM booster_module WHERE guild_id = ?', message.guild.id);
                if (existing) return warn(message, 'Booster role is **already** configured');
                run('INSERT INTO booster_module (guild_id) VALUES (?)', message.guild.id);
                return approve(message, 'Configured booster role module');
            }
        },

        reset: {
            aliases: [],
            data: { name: 'boosterrole reset', description: 'Disable Boosterrole system in your server', usage: ',boosterrole reset' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBoosterConfigured(message, config)) return;
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to unset the boosterrole module? This action is **IRREVERSIBLE**`,
                    async (interaction) => {
                        run('DELETE FROM booster_module WHERE guild_id = ?', message.guild.id);
                        run('DELETE FROM booster_roles WHERE guild_id = ?', message.guild.id);
                        await interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Booster role module cleared` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        await interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Booster role deactivation got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        wipe: {
            aliases: [],
            data: { name: 'boosterrole wipe', description: "Wipe a member's booster role", usage: ',boosterrole wipe <user>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBoosterConfigured(message, config)) return;
                const member = resolveMember(message, args[0]);
                if (!member) return warn(message, 'You must mention a user or provide an id');
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                if (row) {
                    const role = message.guild.roles.cache.get(String(row.role_id));
                    if (role) await role.delete('Booster role wiped').catch(() => {});
                    run('DELETE FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                }
                return approve(message, `Wiped ${member}'s booster role`);
            }
        },

        award: {
            aliases: [],
            data: { name: 'boosterrole award', description: 'Give additional roles to members when they boost the server', usage: ',boosterrole award <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.award);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'boosterrole award add', description: 'Reward a member a specific role upon boost', usage: ',boosterrole award add <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const { role, error } = await newRole(message, args.join(' '), config);
                        if (!role) return warn(message, error);
                        const existing = first('SELECT 1 AS ok FROM booster_award WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (existing) return warn(message, 'This role is **already** a booster role award');
                        run('INSERT INTO booster_award (guild_id, role_id) VALUES (?, ?)', message.guild.id, role.id);
                        return approve(message, `Added ${role} as a booster role award`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'boosterrole award remove', description: 'Remove the reward role', usage: ',boosterrole award remove <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const text = args.join(' ').trim();
                        const role = message.mentions.roles.first() ||
                            (/^\d{17,20}$/.test(text) ? message.guild.roles.cache.get(text) : null) ||
                            message.guild.roles.cache.find(r => r.name.toLowerCase() === text.toLowerCase());
                        const roleId = role ? role.id : /^\d{17,20}$/.test(text) ? text : null;
                        if (!roleId) return warn(message, `Role **${text}** couldn't be found`);
                        const existing = first('SELECT 1 AS ok FROM booster_award WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId);
                        if (!existing) return warn(message, 'This role is **not** a booster role award');
                        run('DELETE FROM booster_award WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId);
                        return approve(message, `Removed ${humanizeRole(message.guild, roleId)} from the booster role awards`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'boosterrole award list', description: 'Returns all the booster role awards in this server', usage: ',boosterrole award list' },
                    async execute(message, args, client, config) {
                        const results = query('SELECT role_id FROM booster_award WHERE guild_id = ?', message.guild.id) || [];
                        if (results.length) {
                            return paginate(message, results.map(row => humanizeRole(message.guild, row.role_id)), 'Booster awards', {
                                name: message.guild.name,
                                icon_url: message.guild.iconURL()
                            });
                        }
                        return warn(message, 'No booster role awards in this server');
                    }
                }
            }
        },

        allow: {
            aliases: [],
            data: { name: 'boosterrole allow', description: 'Allow roles to create booster roles', usage: ',boosterrole allow <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.allow);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'boosterrole allow add', description: 'Allow a role to create booster roles', usage: ',boosterrole allow add <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const { role, error } = await newRole(message, args.join(' '), config);
                        if (!role) return warn(message, error);
                        const existing = first('SELECT 1 AS ok FROM booster_allow WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (existing) return warn(message, 'This role is **already** allowed to create booster roles');
                        run('INSERT INTO booster_allow (guild_id, role_id) VALUES (?, ?)', message.guild.id, role.id);
                        return approve(message, `Added ${role} as a role that can create booster roles`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'boosterrole allow remove', description: 'Remove a role from creating booster roles', usage: ',boosterrole allow remove <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const text = args.join(' ').trim();
                        const role = message.mentions.roles.first() ||
                            (/^\d{17,20}$/.test(text) ? message.guild.roles.cache.get(text) : null) ||
                            message.guild.roles.cache.find(r => r.name.toLowerCase() === text.toLowerCase());
                        const roleId = role ? role.id : /^\d{17,20}$/.test(text) ? text : null;
                        if (!roleId) return warn(message, `Role **${text}** couldn't be found`);
                        const existing = first('SELECT 1 AS ok FROM booster_allow WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId);
                        if (!existing) return warn(message, 'This role is **not** allowed to create booster roles');
                        run('DELETE FROM booster_allow WHERE guild_id = ? AND role_id = ?', message.guild.id, roleId);
                        return approve(message, `Removed ${humanizeRole(message.guild, roleId)} from the roles that can create booster roles`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'boosterrole allow list', description: 'List all roles that can create booster roles', usage: ',boosterrole allow list' },
                    async execute(message, args, client, config) {
                        const results = query('SELECT role_id FROM booster_allow WHERE guild_id = ?', message.guild.id) || [];
                        if (results.length) {
                            return paginate(message, results.map(row => humanizeRole(message.guild, row.role_id)), 'Roles that can create booster roles', {
                                name: message.guild.name,
                                icon_url: message.guild.iconURL()
                            });
                        }
                        return warn(message, 'No roles are allowed to create booster roles in this server');
                    }
                }
            }
        },

        share: {
            aliases: [],
            data: { name: 'boosterrole share', description: 'Share your booster role with others', usage: ',boosterrole share <enable|disable|limit|add|remove|list>' },
            subcommands: ['enable', 'disable', 'limit', 'add', 'remove', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.share);
            },
            subs: {
                enable: {
                    aliases: [],
                    data: { name: 'boosterrole share enable', description: 'Enable sharing your booster role', usage: ',boosterrole share enable' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const row = first('SELECT share_enabled FROM booster_module WHERE guild_id = ?', message.guild.id);
                        if (row && row.share_enabled) return warn(message, 'Booster role sharing is **already** enabled');
                        run('UPDATE booster_module SET share_enabled = 1 WHERE guild_id = ?', message.guild.id);
                        return approve(message, `Booster role sharing is now enabled\n> Use \`${prefix(message)}boosterrole share limit\` to set a limit`);
                    }
                },
                disable: {
                    aliases: [],
                    data: { name: 'boosterrole share disable', description: 'Disable sharing your booster role', usage: ',boosterrole share disable' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const row = first('SELECT share_enabled FROM booster_module WHERE guild_id = ?', message.guild.id);
                        if (row && !row.share_enabled) return warn(message, 'Booster role sharing is **already** disabled');
                        run('UPDATE booster_module SET share_enabled = 0 WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'Booster role sharing is now disabled');
                    }
                },
                limit: {
                    aliases: [],
                    data: { name: 'boosterrole share limit', description: 'Limit the amount of people who can share your booster role', usage: ',boosterrole share limit <amount>' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const limit = parseInt(args[0], 10);
                        if (isNaN(limit) || limit < 0) return warn(message, 'You must provide a valid number');
                        const row = first('SELECT share_enabled FROM booster_module WHERE guild_id = ?', message.guild.id);
                        if (row && !row.share_enabled) return warn(message, `Booster role sharing is **disabled**\n> Use \`${prefix(message)}boosterrole share enable\` to enable it`);
                        run('UPDATE booster_module SET share_limit = ? WHERE guild_id = ?', limit, message.guild.id);
                        return approve(message, `Booster role sharing limit set to **${limit}**`);
                    }
                },
                add: {
                    aliases: [],
                    data: { name: 'boosterrole share add', description: 'Add a member to share your booster role', usage: ',boosterrole share add <user>' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needBoosterRole(message, config)) return;
                        if (!await notBoosterBlacklisted(message)) return;
                        const member = resolveMember(message, args[0]);
                        if (!member) return warn(message, 'You must mention a user or provide an id');
                        if (member.id === message.author.id) return warn(message, "You can't share your booster role with yourself");
                        if (member.user.bot) return warn(message, "You can't share your booster role with a bot");
                        const data = first('SELECT share_enabled, share_limit FROM booster_module WHERE guild_id = ?', message.guild.id);
                        if (!data || !data.share_enabled) return warn(message, `Booster role sharing is **disabled**\n> Use \`${prefix(message)}boosterrole share enable\` to enable it.`);
                        const roleData = first('SELECT role_id, shared_users FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                        if (!roleData) return warn(message, `You don't have a booster role set\n> Please use \`${prefix(message)}boosterrole create\` to create a booster role`);
                        const shared = parseShared(roleData);
                        const limit = data.share_limit == null ? null : data.share_limit;
                        if (limit == null) return warn(message, `Booster role sharing has **no limit** set\n> Use \`${prefix(message)}boosterrole share limit <amount>\` to set one`);
                        if (shared.includes(member.id)) return warn(message, `You are already sharing your booster role with ${member}`);
                        if (shared.length >= limit) return warn(message, `You can only share your role with **${limit}** users`);

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('brshare_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('brshare_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
                        );
                        const sent = await message.reply({
                            content: member.toString(),
                            embeds: [{ color: 0xf47fff, description: `🚀 ${message.author} wants to share their booster role with you. Do you accept?` }],
                            components: [row]
                        });

                        const collector = sent.createMessageComponentCollector({ time: 180000 });
                        collector.on('collect', async i => {
                            if (i.user.id === message.author.id) {
                                return i.reply({ content: "You can't interact with your own request", ephemeral: true }).catch(() => {});
                            }
                            if (i.user.id !== member.id) {
                                return i.reply({ content: 'You are not the **recipient** of this request', ephemeral: true }).catch(() => {});
                            }
                            collector.stop('answered');
                            if (i.customId === 'brshare_decline') {
                                return i.update({
                                    content: null,
                                    embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author} and ${member} will **not** share the booster role.` }],
                                    components: []
                                }).catch(() => {});
                            }
                            const latest = first('SELECT role_id, shared_users FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                            if (!latest) {
                                return i.reply({ content: 'No shared booster role found', ephemeral: true }).catch(() => {});
                            }
                            const list = parseShared(latest);
                            if (list.includes(member.id)) {
                                return i.reply({ content: `You are already sharing the booster role with ${member}`, ephemeral: true }).catch(() => {});
                            }
                            list.push(member.id);
                            run('UPDATE booster_roles SET shared_users = ? WHERE guild_id = ? AND user_id = ?', JSON.stringify(list), message.guild.id, message.author.id);
                            const role = message.guild.roles.cache.get(String(latest.role_id));
                            try {
                                if (role) await member.roles.add(role);
                            } catch (err) {
                                if (err.code === 10004) {
                                    return i.reply({ content: "I couldn't find the booster role", ephemeral: true }).catch(() => {});
                                }
                                return i.reply({ content: "I don't have permission to give the booster role to this user", ephemeral: true }).catch(() => {});
                            }
                            return i.update({
                                content: null,
                                embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author} and ${member} are now sharing the booster role!` }],
                                components: []
                            }).catch(() => {});
                        });
                        collector.on('end', (collected, reason) => {
                            if (reason === 'time') {
                                sent.edit({
                                    content: null,
                                    embeds: [{ color: COLORS.ERROR, description: `${message.author}: ${member} didn't respond in time :(` }],
                                    components: []
                                }).catch(() => {});
                            }
                        });
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'boosterrole share remove', description: 'Remove a member from sharing your booster role', usage: ',boosterrole share remove <user>' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needBoosterRole(message, config)) return;
                        if (!await notBoosterBlacklisted(message)) return;
                        const member = resolveMember(message, args[0]);
                        if (!member) return warn(message, 'You must mention a user or provide an id');
                        if (member.id === message.author.id) return warn(message, "You can't share your booster role with yourself");
                        if (member.user.bot) return warn(message, "You can't share your booster role with a bot");
                        const roleData = first('SELECT role_id, shared_users FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                        if (!roleData) return warn(message, `You don't have a booster role set\n> Please use \`${prefix(message)}boosterrole create\` to create a booster role`);
                        const shared = parseShared(roleData);
                        if (!shared.includes(member.id)) return warn(message, `You are not sharing your booster role with ${member}`);
                        const list = shared.filter(id => String(id) !== member.id);
                        run('UPDATE booster_roles SET shared_users = ? WHERE guild_id = ? AND user_id = ?', JSON.stringify(list), message.guild.id, message.author.id);
                        const role = message.guild.roles.cache.get(String(roleData.role_id));
                        try {
                            if (role) await member.roles.remove(role);
                        } catch (err) {
                            if (err.code === 10004) return warn(message, "I couldn't find the booster role");
                            return warn(message, "I don't have permission to remove the booster role from this user");
                        }
                        return approve(message, `You are no longer sharing your booster role with ${member}`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'boosterrole share list', description: 'List all members you are sharing your booster role with', usage: ',boosterrole share list' },
                    async execute(message, args, client, config) {
                        if (!await needBoosterConfigured(message, config)) return;
                        if (!await needBoosterRole(message, config)) return;
                        if (!await notBoosterBlacklisted(message)) return;
                        const roleData = first('SELECT role_id, shared_users FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                        const shared = parseShared(roleData);
                        if (!shared.length) return warn(message, 'You are not sharing your booster role with anyone');
                        const lines = shared.map(id => memberLabel(message.guild, id));
                        if (lines.length) {
                            return paginate(message, lines, 'Shared users', {
                                name: message.member.displayName,
                                icon_url: message.author.displayAvatarURL()
                            });
                        }
                        return warn(message, 'You are not sharing your booster role with anyone');
                    }
                }
            }
        },

        base: {
            aliases: [],
            data: { name: 'boosterrole base', description: 'Set the base role for where boost roles will go under', usage: ',boosterrole base [role]' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBoosterConfigured(message, config)) return;
                const check = first('SELECT base FROM booster_module WHERE guild_id = ?', message.guild.id);
                if (!args.length || !args.join(' ').trim()) {
                    if (!check || !check.base) return warn(message, "Booster role module **base role** isn't set");
                    run('UPDATE booster_module SET base = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed base role');
                }
                const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0].replace(/[<@&>]/g, '')) ||
                    message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
                if (!role) return warn(message, `Role **${args.join(' ')}** couldn't be found`);
                run('UPDATE booster_module SET base = ? WHERE guild_id = ?', role.id, message.guild.id);
                return approve(message, `Set ${role} as base role`);
            }
        },

        limit: {
            aliases: [],
            data: { name: 'boosterrole limit', description: 'Set the limit of booster roles that can be created', usage: ',boosterrole limit <amount>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needBoosterConfigured(message, config)) return;
                const limit = parseInt(args[0], 10);
                if (isNaN(limit) || limit < 0) return warn(message, 'You must provide a valid number');
                const row = first('SELECT "limit" FROM booster_module WHERE guild_id = ?', message.guild.id);
                if (row && row.limit === limit) return warn(message, `Booster role limit is **already** set to **${limit}**`);
                run('UPDATE booster_module SET "limit" = ? WHERE guild_id = ?', limit, message.guild.id);
                return approve(message, `Set booster role limit to **${limit}**`);
            }
        },

        create: {
            aliases: [],
            data: { name: 'boosterrole create', description: 'Create a booster role', usage: ',boosterrole create <hex> [name]' },
            async execute(message, args, client, config) {
                if (!await needBoosterConfigured(message, config)) return;
                if (!await notBoosterBlacklisted(message)) return;

                if (!message.member.premiumSince) {
                    const allowed = query('SELECT role_id FROM booster_allow WHERE guild_id = ?', message.guild.id) || [];
                    const roleIds = (allowed || []).map(row => String(row.role_id));
                    const memberRoleIds = message.member.roles.cache.map(r => r.id);
                    if (roleIds.length) {
                        if (!roleIds.some(id => memberRoleIds.includes(id))) {
                            return warn(message, 'You need to **boost** or have any of these roles: ' + roleIds.map(id => `<@&${id}>`).join(', '));
                        }
                    } else {
                        return warn(message, 'You need to **boost** the server to create a booster role');
                    }
                }

                const limitRow = first('SELECT "limit" FROM booster_module WHERE guild_id = ?', message.guild.id);
                if (limitRow && limitRow.limit > 0) {
                    const count = first('SELECT COUNT(*) AS c FROM booster_roles WHERE guild_id = ?', message.guild.id);
                    if (count && count.c >= limitRow.limit) {
                        return warn(message, `Booster role limit reached, you can only have **${limitRow.limit}** booster roles`);
                    }
                }

                const colorText = args.shift();
                const color = parseColor(colorText);
                if (!color) return warn(message, `**${colorText || ''}** is not a valid hex code`);

                let name = args.join(' ').trim();
                if (name && name.length > 100) return warn(message, 'Boosterrole name has to be fewer then 100 characters');

                const me = message.guild.members.me;
                if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    return warn(message, "I don't have permission to manage roles.");
                }
                if (message.guild.roles.cache.size >= 250) {
                    return warn(message, "You can't create more roles in this server, please delete some roles");
                }

                const existing = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                if (existing) {
                    const existingRole = message.guild.roles.cache.get(String(existing.role_id));
                    return warn(message, `You already have ${existingRole || existing.role_id} as booster role`);
                }

                if (!name) name = `${message.author.name}'s role`;

                let role;
                try {
                    role = await message.guild.roles.create({ name, color: color.value, reason: 'Booster role created' });
                } catch (err) {
                    return replyError(message, err);
                }

                const baseRow = first('SELECT base FROM booster_module WHERE guild_id = ?', message.guild.id);
                const base = baseRow && baseRow.base ? message.guild.roles.cache.get(String(baseRow.base)) : null;
                try {
                    if (base) {
                        await role.setPosition(Math.max(0, base.position - 1));
                    } else {
                        const userHighest = message.member.roles.highest;
                        const botHighest = me.roles.highest;
                        try {
                            await role.setPosition(userHighest.position + 1);
                        } catch (err) {
                            try {
                                await role.setPosition(botHighest.position + 1);
                            } catch (err2) {
                                await role.delete().catch(() => {});
                                return warn(message, "I don't have permission to edit the role position.");
                            }
                        }
                    }
                } catch (err) {
                    await role.delete().catch(() => {});
                    return warn(message, "I don't have permission to edit the role position.");
                }

                try {
                    await message.member.roles.add(role);
                } catch (err) {
                    await role.delete().catch(() => {});
                    return warn(message, "I don't have permission to give you the role.");
                }

                run('INSERT INTO booster_roles (guild_id, user_id, role_id) VALUES (?, ?, ?)', message.guild.id, message.author.id, role.id);
                return approve(message, `Booster role ${role} created successfully!`);
            }
        },

        name: {
            aliases: [],
            data: { name: 'boosterrole name', description: 'Edit your booster roles name', usage: ',boosterrole name <name>' },
            async execute(message, args, client, config) {
                if (!await needBoosterRole(message, config)) return;
                if (!await notBoosterBlacklisted(message)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name');
                if (name.length > 32) return warn(message, "The booster role name can't have more than **32** characters");
                const banned = getBannedWords(message.guild.id);
                if (containsBannedWord(banned, name)) {
                    return warn(message, 'This role name contains a prohibited word. Please choose a different name.');
                }
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                const role = row ? message.guild.roles.cache.get(String(row.role_id)) : null;
                if (!role) return warn(message, `Your booster role was deleted\n> Please use \`${prefix(message)}br delete\` then \`${prefix(message)}br create\``);
                try {
                    await role.edit({ name, reason: 'Edited booster role name' });
                } catch (err) {
                    if (err.code === 10004) return warn(message, "I couldn't find your booster role");
                    if (err.code === 50013) return warn(message, "I don't have permission to edit your booster role");
                    return replyError(message, err);
                }
                return approve(message, `Edited the booster role name to **${name}**`);
            }
        },

        color: {
            aliases: [],
            data: { name: 'boosterrole color', description: 'Edit your booster roles color', usage: ',boosterrole color <hex>' },
            async execute(message, args, client, config) {
                if (!await needBoosterRole(message, config)) return;
                if (!await notBoosterBlacklisted(message)) return;
                const color = parseColor(args.join(' '));
                if (!color) return warn(message, `**${args.join(' ')}** is not a valid hex code`);
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                const role = row ? message.guild.roles.cache.get(String(row.role_id)) : null;
                if (!role) return warn(message, `Your booster role was deleted\n> Please use \`${prefix(message)}br delete\` then \`${prefix(message)}br create\``);
                try {
                    await role.edit({ color: color.value, reason: 'Edited booster role color' });
                } catch (err) {
                    if (err.code === 10004) return warn(message, "I couldn't find your booster role");
                    if (err.code === 50013) return warn(message, "I don't have permission to edit your booster role");
                    return replyError(message, err);
                }
                return message.reply({
                    embeds: [{ color: color.value, description: `${message.author}: Edited the role's color to \`${color.hex}\`` }]
                });
            }
        },

        icon: {
            aliases: [],
            data: { name: 'boosterrole icon', description: 'Edit your booster roles icon', usage: ',boosterrole icon <emoji|url|none>' },
            async execute(message, args, client, config) {
                if (!await needBoosterRole(message, config)) return;
                if (!await needBoostedTo(message, 2)) return;
                if (!await notBoosterBlacklisted(message)) return;
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                const role = row ? message.guild.roles.cache.get(String(row.role_id)) : null;
                if (!role) return warn(message, `Your booster role was deleted\n> Please use \`${prefix(message)}br delete\` then \`${prefix(message)}br create\``);

                const text = args.join(' ').trim();
                try {
                    if (text.toLowerCase() === 'none') {
                        await role.setIcon(null, 'Edited the booster role icon');
                        return approve(message, 'Booster role icon successfully removed');
                    }
                    const image = await resolveIconSource(message, args);
                    if (image === undefined) return warn(message, 'Invalid emoji or URL provided.');
                    if (!image || !image.length) return warn(message, 'Unable to retrieve or process the image.');
                    await role.setIcon(image, 'Edited the booster role icon');
                    return approve(message, `Booster role icon successfully changed to **${text || 'attachment'}**`);
                } catch (err) {
                    if (err.code === 10004) return warn(message, "I couldn't find your booster role");
                    if (err.code === 50013) return warn(message, "I don't have permission to edit your booster role");
                    return replyError(message, err);
                }
            }
        },

        delete: {
            aliases: [],
            data: { name: 'boosterrole delete', description: 'Delete your booster role', usage: ',boosterrole delete' },
            async execute(message, args, client, config) {
                if (!await needBoosterRole(message, config)) return;
                if (!await notBoosterBlacklisted(message)) return;
                const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                if (row) {
                    const role = message.guild.roles.cache.get(String(row.role_id));
                    if (role) {
                        try {
                            await role.delete('Booster role deleted');
                        } catch (err) {
                            if (err.code === 50013) return warn(message, "I don't have permission to delete the booster role");
                            if (err.code !== 10004) return replyError(message, err);
                        }
                    }
                    run('DELETE FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
                }
                return approve(message, 'Booster role deleted');
            }
        },

        list: {
            aliases: [],
            data: { name: 'boosterrole list', description: 'View all booster roles', usage: ',boosterrole list' },
            async execute(message, args, client, config) {
                const results = query('SELECT role_id, user_id FROM booster_roles WHERE guild_id = ?', message.guild.id) || [];
                if (!results || !results.length) return warn(message, 'No **booster roles** found in this server');
                const lines = results.map(row => {
                    const role = message.guild.roles.cache.get(String(row.role_id));
                    return `${role || `<@&${row.role_id}>`} owned by <@!${row.user_id}>`;
                });
                return paginate(message, lines, 'Booster Roles', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
