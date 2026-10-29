const { PermissionFlagsBits } = require('discord.js');
const { query, first, run, warnStamp } = require('../../utils/database');
const { paginate, warn, approve, parseTime } = require('../../utils/context');
const { needPerm, needBotPerm, formatTimespan, noStaff, invokeDm, invokeMessage, insertCase, sendModLog, splitReason, confirm } = require('../../utils/moderation');
const { resolveMember } = require('../../utils/roleplay');
const { sendCard } = require('../../utils/helpCard');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendPunishmentDm } = require('../../utils/appeals');

const MAX_DURATION = 28 * 24 * 60 * 60;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

function formatWarnTime(value) {
    const text = String(value);
    const numeric = Number(text);
    if (text.trim() !== '' && Number.isFinite(numeric)) return `<t:${Math.floor(numeric)}:F>`;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}) at (\d{1,2}):(\d{2}) (AM|PM)$/i);
    if (match) {
        const hour = Number(match[4]) % 12 + (/pm/i.test(match[6]) ? 12 : 0);
        const stamp = new Date(2000 + Number(match[3]), Number(match[2]) - 1, Number(match[1]), hour, Number(match[5]));
        if (!Number.isNaN(stamp.getTime())) return `<t:${Math.floor(stamp.getTime() / 1000)}:R>`;
    }
    return 'Unknown Time Format';
}

function warnRows(guildId, userId) {
    if (userId) return query('SELECT * FROM warns WHERE guild_id = ? AND user_id = ? ORDER BY time', guildId, userId);
    return query('SELECT * FROM warns WHERE guild_id = ? ORDER BY time', guildId);
}

async function applyRewardRole(member, level) {
    const reward = first('SELECT role_id FROM warns_rewards WHERE guild_id = ? AND warn = ?', member.guild.id, level);
    if (!reward) return;
    const role = member.guild.roles.cache.get(String(reward.role_id));
    if (!role) return;
    await member.roles.add(role, `Warned ${level} times`).catch(() => {});
}

async function removeRewardRoles(member, level) {
    const reward = first('SELECT role_id FROM warns_rewards WHERE guild_id = ? AND warn = ?', member.guild.id, level);
    if (!reward) return;
    const role = member.guild.roles.cache.get(String(reward.role_id));
    if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role, 'Removed roles due to warning removal.').catch(() => {});
    }
}

async function decidePunishment(message, client, member, level, reason) {
    const row = first('SELECT action, time FROM warns_punishment WHERE guild_id = ? AND warn = ?', message.guild.id, level);
    if (!row) return;
    const detail = `${reason} | ${level} warns`.split(' ');
    const target = String(member.id);
    try {
        if (row.action === 'mute') {
            const time = Math.floor(Number(row.time) || 3600);
            await require('./mute').execute(message, [target, `${time}s`, ...detail], client);
        } else if (row.action === 'jail') {
            const time = Math.floor(Number(row.time) || 3600);
            await require('./jail').execute(message, [target, `${time}s`, ...detail], client);
        } else if (row.action === 'kick') {
            await require('./kick').execute(message, [target, ...detail], client);
        } else if (row.action === 'ban') {
            await require('./ban').execute(message, [target, ...detail], client);
        }
    } catch (err) {
        return;
    }
}

async function findManageableRole(message, value) {
    if (!value) {
        await warn(message, 'Usage: `warn rewards add <warn> <role>`');
        return null;
    }
    if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return null;
    const guild = message.guild;
    let role = null;
    const id = String(value).replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) role = guild.roles.cache.get(id) || null;
    if (!role) {
        const lower = value.toLowerCase();
        role = guild.roles.cache.find(entry => entry.name.toLowerCase() === lower)
            || guild.roles.cache.find(entry => entry.name.toLowerCase().startsWith(lower))
            || guild.roles.cache.find(entry => entry.name.toLowerCase().includes(lower))
            || null;
    }
    if (!role) {
        await warn(message, `Role **${value}** couldn't be found`);
        return null;
    }
    const me = guild.members.me;
    if (role.managed || role.id === guild.roles.everyone.id) {
        await warn(message, `Role **${value}** can't be managed by anyone`);
        return null;
    }
    if (me && role.position >= me.roles.highest.position) {
        await warn(message, `Role **${value}** is over my highest role`);
        return null;
    }
    if (guild.ownerId !== message.author.id && role.position >= message.member.roles.highest.position) {
        await warn(message, "You can't manage this role");
        return null;
    }
    return role;
}

module.exports = {
    data: { name: 'warn', description: '', usage: ',warn <member> [reason] [--s]' },
    aliases: [],
    cooldown: 5,
    subcommands: ['all', 'clear', 'list', 'punishment', 'remove', 'reset', 'rewards'],
    subUsages: {
        all: ',warn all',
        clear: ',warn clear <member> [reason]',
        list: ',warn list <member>',
        punishment: ',warn punishment <add|remove|reset|list>',
        remove: ',warn remove <member> <warn> [reason]',
        reset: ',warn reset',
        rewards: ',warn rewards <add|remove|reset|list|sync>'
    },
    subs: {
        all: {
            aliases: [],
            data: { name: 'warn all', description: 'Returns all warns on the server', usage: ',warn all' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                const rows = warnRows(message.guild.id);
                if (!rows.length) return warn(message, 'There are no warnings on this server.');
                const lines = rows.map(row =>
                    `<@!${row.user_id}> ${row.reason} - ${formatWarnTime(row.time)}\n↳ **Moderator:** <@!${row.author_id}>`);
                return paginate(message, lines, 'Server Warnings', guildAuthor(message));
            }
        },
        clear: {
            aliases: [],
            data: { name: 'warn clear', description: 'Clear all warns from an user', usage: ',warn clear its_washed' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                if (!args.length) return warn(message, 'Usage: `warn clear <member> [reason]`');
                const member = await noStaff(message, args[0], 'warn');
                if (!member) return;
                const rows = warnRows(message.guild.id, member.id);
                if (!rows.length) return warn(message, `${member} has no warnings`);
                run('DELETE FROM warns WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                const parsed = splitReason(args, 1);
                insertCase(message, member, 'Warn Clear', 'None', parsed.reason, Date.now() / 1000);
                return approve(message, `Removed ${member}'s warns`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'warn list', description: 'Returns all warns that a user has', usage: ',warn list its_washed' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                if (!args.length) return warn(message, 'Usage: `warn list <member>`');
                const member = await resolveMember(message, args[0]);
                if (!member) return warn(message, `Member **${args[0]}** couldn't be found`);
                const rows = warnRows(message.guild.id, member.id);
                if (!rows.length) return warn(message, `${member} has no warnings`);
                const lines = rows.map(row => `<@!${row.author_id}> ${row.reason} - ${formatWarnTime(row.time)}`);
                return paginate(message, lines, 'Warnings', {
                    name: member.user.username,
                    icon_url: member.user.displayAvatarURL({ size: 256 })
                });
            }
        },
        punishment: {
            aliases: [],
            data: { name: 'warn punishment', description: 'Manage punishments that get a user for certains warns', usage: ',warn punishment <add|remove|reset|list>' },
            subcommands: ['add', 'list', 'remove', 'reset'],
            subUsages: {
                add: ',warn punishment add <warn> <ban|kick|jail|mute> [time]',
                remove: ',warn punishment remove <warn>'
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'warn punishment add', description: 'Assign a punishment to a warn level', usage: ',warn punishment add 3 ban 12h' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const level = parseInt(args[0], 10);
                        if (!Number.isFinite(level)) return warn(message, 'Usage: `warn punishment add <warn> <ban|kick|jail|mute> [time]`');
                        if (level < 1) return warn(message, `It's not possible to add a punishment for **${level} warns**`);
                        const action = String(args[1] || '').toLowerCase();
                        if (!action) return warn(message, 'Usage: `warn punishment add <warn> <ban|kick|jail|mute> [time]`');
                        const existing = first('SELECT warn FROM warns_punishment WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        if (existing) return warn(message, `There are already a punishment set for **${level} warns**`);
                        if (action === 'ban' || action === 'kick') {
                            run('INSERT INTO warns_punishment (guild_id, warn, action, time) VALUES (?, ?, ?, ?)', message.guild.id, level, action, null);
                            return approve(message, `Added **${action}** as punishment for **${level} warns**`);
                        }
                        if (action === 'jail' || action === 'mute') {
                            let time = null;
                            if (args[2]) {
                                time = parseTime(args[2]);
                                if (time === null) return warn(message, `**${args[2]}** is an invalid timespan`);
                            }
                            if (time === null) time = 3600;
                            if (time > MAX_DURATION) return warn(message, "You can't set a duration with more than **28 days**");
                            const duration = time !== 0 ? formatTimespan(time) : 'Infinity';
                            run('INSERT INTO warns_punishment (guild_id, warn, action, time) VALUES (?, ?, ?, ?)', message.guild.id, level, action, time);
                            return approve(message, `Added **${action}** (\`${duration}\`) as punishment for **${level} warns**`);
                        }
                        return warn(message, 'Invalid action. Valid actions are: `ban`, `kick`, `jail` & `mute`');
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'warn punishment remove', description: 'Remove a punishment from a warn level', usage: ',warn punishment remove 3' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const level = parseInt(args[0], 10);
                        if (!Number.isFinite(level)) return warn(message, 'Usage: `warn punishment remove <warn>`');
                        if (level < 1) return warn(message, `It's not possible to add a punishment for **${level} warns**`);
                        const row = first('SELECT * FROM warns_punishment WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        if (!row) return warn(message, `There are no punishment set for **${level} warns**`);
                        run('DELETE FROM warns_punishment WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        return approve(message, `Removed **${row.action}** as punishment for **${level} warns**`);
                    }
                },
                reset: {
                    aliases: [],
                    data: { name: 'warn punishment reset', description: 'Remove every punishment that was added', usage: ',warn punishment reset' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        return confirm(message, `${message.author}: Are you sure that you want to **remove** every punishment saved in this server?`,
                            async i => {
                                run('DELETE FROM warns_punishment WHERE guild_id = ?', message.guild.id);
                                await i.update({ embeds: [successEmbed(null, `${i.user}: Removed every punishment that was saved in this server`)], components: [] }).catch(() => {});
                            },
                            async i => {
                                await i.update({ embeds: [errorEmbed(null, `${i.user}: Warn punishment deletion got canceled`)], components: [] }).catch(() => {});
                            });
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'warn punishment list', description: 'Get a list of every punishment in this server', usage: ',warn punishment list' },
                    execute: async (message, args, client) => {
                        const rows = query('SELECT action, warn, time FROM warns_punishment WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'There are no punishments set for warns');
                        rows.sort((a, b) => Number(a.warn) - Number(b.warn));
                        const lines = rows.map(row => {
                            const action = String(row.action).charAt(0).toUpperCase() + String(row.action).slice(1);
                            const duration = row.time ? ` (\`${Number(row.time) !== 0 ? formatTimespan(row.time) : 'Infinity'}\`)` : '';
                            return `${action}${duration} for **${row.warn} warns**`;
                        });
                        return paginate(message, lines, 'Warn Punishments', guildAuthor(message));
                    }
                }
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.punishment)
        },
        remove: {
            aliases: [],
            data: { name: 'warn remove', description: 'Remove a specific warn by its number', usage: ',warn remove its_washed 1' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
                if (args.length < 2) return warn(message, 'Usage: `warn remove <member> <warn> [reason]`');
                const member = await resolveMember(message, args[0]);
                if (!member) return warn(message, `Member **${args[0]}** couldn't be found`);
                const rows = warnRows(message.guild.id, member.id);
                if (!rows.length) return warn(message, `${member} has no warnings.`);
                const index = parseInt(args[1], 10);
                if (!Number.isFinite(index) || index < 1 || index > rows.length) {
                    return warn(message, `Warn ID \`${args[1]}\` is **invalid**`);
                }
                run('DELETE FROM warns WHERE guild_id = ? AND user_id = ? AND time = ?', message.guild.id, member.id, rows[index - 1].time);
                const remaining = warnRows(message.guild.id, member.id);
                if (remaining.length) {
                    await applyRewardRole(member, remaining.length);
                } else {
                    await removeRewardRoles(member, 1);
                }
                const parsed = splitReason(args, 2);
                insertCase(message, member, 'Warn Remove', 'None', parsed.reason, Date.now() / 1000);
                return approve(message, `Removed warning **#${index}** from ${member}`);
            }
        },
        reset: {
            aliases: [],
            data: { name: 'warn reset', description: 'Reset all warns from your server', usage: ',warn reset' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const rows = query('SELECT * FROM warns WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'Your server has no warnings');
                run('DELETE FROM warns WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Removed all server warns');
            }
        },
        rewards: {
            aliases: [],
            data: { name: 'warn rewards', description: 'Manage the roles that get a user for certains warns', usage: ',warn rewards <add|remove|reset|list|sync>' },
            subcommands: ['add', 'list', 'remove', 'reset', 'sync'],
            subUsages: {
                add: ',warn rewards add <warn> <role>',
                remove: ',warn rewards remove <warn>'
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'warn rewards add', description: 'Assign a warn role to a warn level', usage: ',warn rewards add 3 dangerous' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const level = parseInt(args[0], 10);
                        if (!Number.isFinite(level)) return warn(message, 'Usage: `warn rewards add <warn> <role>`');
                        if (level < 1) return warn(message, `It's not possible to add a reward for **${level} warns**`);
                        const existing = first('SELECT warn FROM warns_rewards WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        if (existing) return warn(message, `There are already a reward for reaching **${level} warns**`);
                        const role = await findManageableRole(message, args.slice(1).join(' '));
                        if (!role) return;
                        run('INSERT INTO warns_rewards (guild_id, warn, role_id) VALUES (?, ?, ?)', message.guild.id, level, role.id);
                        return approve(message, `Added a reward for reaching **${level} warns**`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'warn rewards remove', description: 'Remove a reward from a warn level', usage: ',warn rewards remove <warn>' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const level = parseInt(args[0], 10);
                        if (!Number.isFinite(level)) return warn(message, 'Usage: `warn rewards remove <warn>`');
                        const row = first('SELECT * FROM warns_rewards WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        if (!row) return warn(message, `There are no rewards set for **${level} warns**`);
                        run('DELETE FROM warns_rewards WHERE guild_id = ? AND warn = ?', message.guild.id, level);
                        return approve(message, `Removed a reward for reaching **${row.warn} warns**`);
                    }
                },
                reset: {
                    aliases: [],
                    data: { name: 'warn rewards reset', description: 'Remove every reward that was added', usage: ',warn rewards reset' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        return confirm(message, `${message.author}: Are you sure that you want to **remove** every reward saved in this server?`,
                            async i => {
                                run('DELETE FROM warns_rewards WHERE guild_id = ?', message.guild.id);
                                await i.update({ embeds: [successEmbed(null, `${i.user}: Removed every reward that was saved in this server`)], components: [] }).catch(() => {});
                            },
                            async i => {
                                await i.update({ embeds: [errorEmbed(null, `${i.user}: Warn reward deletion got canceled`)], components: [] }).catch(() => {});
                            });
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'warn rewards list', description: 'Get a list of every role reward in this server', usage: ',warn rewards list' },
                    execute: async (message, args, client) => {
                        const rows = query('SELECT role_id, warn FROM warns_rewards WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'There are no warn rewards set');
                        rows.sort((a, b) => Number(a.warn) - Number(b.warn));
                        const lines = rows.map(row => {
                            const role = message.guild.roles.cache.get(String(row.role_id));
                            return `${role ? role : `\`${row.role_id}\``} for **${row.warn} warns**`;
                        });
                        return paginate(message, lines, 'Warn rewards', guildAuthor(message));
                    }
                },
                sync: {
                    aliases: [],
                    data: { name: 'warn rewards sync', description: "Sync all user's roles based on their warns", usage: ',warn rewards sync' },
                    execute: async (message, args, client) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const guild = message.guild;
                        const rewards = query('SELECT warn, role_id FROM warns_rewards WHERE guild_id = ?', guild.id);
                        if (!rewards.length) return warn(message, 'There are no warn rewards configured for this server');
                        const byLevel = {};
                        for (const entry of rewards) {
                            const level = String(entry.warn);
                            if (!byLevel[level]) byLevel[level] = [];
                            byLevel[level].push(String(entry.role_id));
                        }
                        const counts = query('SELECT user_id, COUNT(*) AS count FROM warns WHERE guild_id = ? GROUP BY user_id', guild.id);
                        if (!counts.length) return warn(message, 'No user warns found for this server');
                        const loading = await message.channel.send({
                            embeds: [{ color: 0x729bb0, description: 'Synchronizing all users roles with their warns...' }]
                        });
                        for (let i = 0; i < counts.length; i += 5) {
                            const batch = counts.slice(i, i + 5);
                            for (const entry of batch) {
                                const member = guild.members.cache.get(String(entry.user_id));
                                if (!member) continue;
                                const total = Number(entry.count) || 0;
                                const toAdd = [];
                                for (let level = 1; level <= total; level++) {
                                    for (const roleId of byLevel[String(level)] || []) {
                                        const role = guild.roles.cache.get(roleId);
                                        if (role && !member.roles.cache.has(role.id)) toAdd.push(role);
                                    }
                                }
                                if (toAdd.length) await member.roles.add(toAdd, 'Syncing warn rewards').catch(() => {});
                                const toRemove = [];
                                for (const level of Object.keys(byLevel)) {
                                    if (Number(level) > total) {
                                        for (const roleId of byLevel[level]) {
                                            const role = guild.roles.cache.get(roleId);
                                            if (role && member.roles.cache.has(role.id)) toRemove.push(role);
                                        }
                                    }
                                }
                                if (toRemove.length) await member.roles.remove(toRemove, 'Syncing warn rewards').catch(() => {});
                                await sleep(2000);
                            }
                        }
                        await loading.edit({
                            embeds: [{ color: 0x39ffb8, description: 'All users roles have been synchronized based on their warns.' }]
                        }).catch(() => {});
                        return null;
                    }
                }
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.rewards)
        }
    },

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        if (!args.length) return sendCard(message, module.exports);

        const member = await noStaff(message, args[0], 'warn');
        if (!member) return;

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;
        const silent = parsed.silent;

        let dmMessageId = null;
        if (!silent) {
            const invoked = await invokeDm(member, message.guild.id, 'warn', { reason }).catch(() => false);
            if (!invoked) {
                try {
                    dmMessageId = await sendPunishmentDm(member, message.guild.id, `You have been warned on **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`);
                } catch (err) {
                    dmMessageId = null;
                }
            }
        }

        run('INSERT INTO warns (guild_id, user_id, author_id, time, reason) VALUES (?, ?, ?, ?, ?)',
            message.guild.id, member.id, message.author.id, warnStamp(new Date()), reason);

        const rows = warnRows(message.guild.id, member.id);
        for (let level = 1; level <= rows.length; level++) {
            await applyRewardRole(member, level);
        }

        const historyId = insertCase(message, member, 'Warn', 'None', reason, Date.now() / 1000, dmMessageId);

        await sendModLog(message.guild, {
            user: member,
            moderator: message.author,
            reason,
            description: `warned ${rows.length} times`,
            punishment: 'Warn',
            historyId
        });

        const invoked = await invokeMessage(message, 'warn', member, { reason, historyId }).catch(() => false);
        if (!invoked) {
            await approve(message, `Warned ${member} (\`#${historyId}\`) - ${reason}`);
        }

        return decidePunishment(message, client, member, rows.length, reason);
    }
};
