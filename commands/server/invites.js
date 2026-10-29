const { PermissionFlagsBits } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { parseChannel } = require('../../utils/helpers');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

function iconOf(guild) {
    return guild.icon ? guild.iconURL({ size: 256 }) : undefined;
}

function needsEnabled(message, settings) {
    if (settings) return true;
    warn(message, 'Invite tracking is not enabled.');
    return false;
}

function parseMember(message, token) {
    if (!token) return message.member;
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const cleaned = String(token).replace(/[<@!>]/g, '');
    return message.guild.members.cache.get(cleaned) || null;
}

module.exports = {
    data: { name: 'invites', description: 'Returns the number of invites you have in the server', usage: ',invites [member]' },
    aliases: ['invitetracker', 'invt', 'it'],
    cooldown: 5,
    subcommands: ['rewards', 'enable', 'disable', 'fake-threshold', 'bonus', 'message', 'logs', 'leaderboard', 'inviter', 'invited', 'code'],
    execute: async (message, args, client) => {
        const member = parseMember(message, args[0]);
        if (!member) return warn(message, 'Member couldn\'t be found');
        const settings = first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id);
        let invites = 0;
        if (!settings) {
            const codes = await message.guild.invites.fetch().catch(() => null);
            if (codes) invites = codes.filter(invite => invite.inviter && invite.inviter.id === member.id).reduce((sum, invite) => sum + (invite.uses || 0), 0);
        } else {
            const row = first('SELECT * FROM invites WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
            if (row) invites = Number(row.regular_count || 0) + Number(row.bonus || 0);
        }
        const lead = member.id === message.author.id ? 'You have' : `${member} has`;
        return message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `💌 ${lead} **${invites} invites**` })] });
    },
    subs: {
        rewards: {
            aliases: [],
            data: { name: 'invites rewards', description: 'Manage the invite rewards for the server.', usage: ',invites rewards <add|remove|stack|sync|list>' },
            subcommands: ['add', 'remove', 'stack', 'sync', 'list'],
            execute: async (message) => sendCard(message, module.exports.subs.rewards),
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'invites rewards add', description: 'Add a role reward for the invite tracker.', usage: ',invites rewards add <threshold> <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const threshold = parseInt(args[0], 10);
                        const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args[1] || '').replace(/[<@&>]/g, ''));
                        if (!Number.isInteger(threshold) || !role) return warn(message, 'Usage: `invites rewards add <threshold> <role>`');
                        if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                        if (first('SELECT * FROM invites_rewards WHERE guild_id = ? AND threshold = ?', message.guild.id, threshold)) {
                            return warn(message, `A reward for **${threshold} invites** already exists.`);
                        }
                        run('INSERT INTO invites_rewards (guild_id, threshold, role_id) VALUES (?, ?, ?)', message.guild.id, threshold, role.id);
                        return approve(message, `Role reward has been added for **${threshold} invites**`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'invites rewards remove', description: 'Remove a role reward for the invite tracker.', usage: ',invites rewards remove <threshold>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const threshold = parseInt(args[0], 10);
                        if (!Number.isInteger(threshold)) return warn(message, 'Usage: `invites rewards remove <threshold>`');
                        if (!first('SELECT * FROM invites_rewards WHERE guild_id = ? AND threshold = ?', message.guild.id, threshold)) {
                            return warn(message, 'Role reward does not exist.');
                        }
                        run('DELETE FROM invites_rewards WHERE guild_id = ? AND threshold = ?', message.guild.id, threshold);
                        return approve(message, `Role reward for **${threshold} invites** has been removed.`);
                    }
                },
                stack: {
                    aliases: [],
                    data: { name: 'invites rewards stack', description: 'Toggle the removal of old invite rewards when a new one is added', usage: ',invites rewards stack <on|off>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const option = String(args[0] || '').toLowerCase();
                        if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                        if (option === 'on') {
                            run('UPDATE invites_settings SET autoupdate = ? WHERE guild_id = ?', 1, message.guild.id);
                            return approve(message, 'Enabled stacking rewards for invites');
                        }
                        if (option === 'off') {
                            run('UPDATE invites_settings SET autoupdate = ? WHERE guild_id = ?', 0, message.guild.id);
                            return approve(message, 'Disabled stacking rewards for invites');
                        }
                        return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                    }
                },
                sync: {
                    aliases: [],
                    data: { name: 'invites rewards sync', description: 'Sync the role rewards with the current invites.', usage: ',invites rewards sync' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const config = first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id);
                        if (!needsEnabled(message, config)) return;
                        const autoupdate = Boolean(config.autoupdate);
                        const rewards = query('SELECT * FROM invites_rewards WHERE guild_id = ? ORDER BY threshold ASC', message.guild.id);
                        if (!rewards.length) return warn(message, 'No role rewards have been set.');
                        for (const member of message.guild.members.cache.values()) {
                            const row = first('SELECT regular_count, bonus FROM invites WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                            if (!row) continue;
                            const inviteCount = Number(row.regular_count || 0) + Number(row.bonus || 0);
                            if (autoupdate) {
                                let highest = null;
                                for (const reward of rewards) {
                                    if (inviteCount >= Number(reward.threshold)) highest = message.guild.roles.cache.get(String(reward.role_id)) || null;
                                }
                                const currentRoleIds = rewards
                                    .filter(reward => member.roles.cache.has(String(reward.role_id)))
                                    .map(reward => String(reward.role_id));
                                for (const roleId of currentRoleIds) {
                                    const role = message.guild.roles.cache.get(roleId);
                                    if (role && (!highest || role.id !== highest.id)) {
                                        await member.roles.remove(role, 'Invite reward updated').catch(() => {});
                                    }
                                }
                                if (highest && !member.roles.cache.has(highest.id)) {
                                    await member.roles.add(highest, 'Invite Tracker Role Reward synced').catch(() => {});
                                }
                            } else {
                                for (const reward of rewards) {
                                    if (inviteCount >= Number(reward.threshold)) {
                                        const role = message.guild.roles.cache.get(String(reward.role_id));
                                        if (role && !member.roles.cache.has(role.id)) {
                                            await member.roles.add(role, 'Invite Tracker Role Reward synced').catch(() => {});
                                        }
                                    }
                                }
                            }
                        }
                        return approve(message, 'Role rewards have been **synced** with the current invites.');
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'invites rewards list', description: 'List all the role rewards for the invite tracker.', usage: ',invites rewards list' },
                    execute: async (message) => {
                        const rewards = query('SELECT * FROM invites_rewards WHERE guild_id = ?', message.guild.id);
                        if (!rewards.length) return warn(message, 'No role rewards have been set.');
                        const lines = rewards.map(record => {
                            const role = message.guild.roles.cache.get(String(record.role_id));
                            return `**${record.threshold}** invites - ${role ? role : `<@&${record.role_id}>`}`;
                        });
                        return paginate(message, lines, `Role Rewards (${lines.length})`, { name: message.guild.name, icon_url: iconOf(message.guild) });
                    }
                }
            }
        },
        enable: {
            aliases: [],
            data: { name: 'invites enable', description: 'Enable invite tracking for the server.', usage: ',invites enable' },
            execute: async (message) => {
                if (first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Invite tracking is already enabled.');
                }
                run('INSERT INTO invites_settings (guild_id) VALUES (?)', message.guild.id);
                return approve(message, 'Invite tracking has been enabled.');
            }
        },
        disable: {
            aliases: [],
            data: { name: 'invites disable', description: 'Disable the invite tracker', usage: ',invites disable' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                return confirm(message, `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to reset all invite data for the server?`,
                    async (interaction) => {
                        for (const table of ['invites', 'invites_users', 'invites_settings', 'invites_rewards']) {
                            run(`DELETE FROM ${table} WHERE guild_id = ?`, message.guild.id);
                        }
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user} Invite data has been reset for the server.` })],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user} Invite settings reset got canceled` })],
                            components: []
                        }).catch(() => {});
                    });
            }
        },
        'fake-threshold': {
            aliases: ['ft', 'threshold'],
            data: { name: 'invites fake-threshold', description: 'Set the fake invite threshold for the server.', usage: ',invites fake-threshold <days>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const threshold = parseInt(args[0], 10);
                if (!Number.isInteger(threshold)) return warn(message, 'Usage: `invites fake-threshold <days>`');
                if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                run('UPDATE invites_settings SET fake_threshold = ? WHERE guild_id = ?', threshold, message.guild.id);
                return approve(message, `Accounts younger than **${threshold} days** are now considered fake users.`);
            }
        },
        bonus: {
            aliases: [],
            data: { name: 'invites bonus', description: 'Manage the bonus invites for the server.', usage: ',invites bonus <add|remove>' },
            subcommands: ['add', 'remove'],
            execute: async (message) => sendCard(message, module.exports.subs.bonus),
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'invites bonus add', description: 'Add bonus invites to a user.', usage: ',invites bonus add <member> <amount>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const member = parseMember(message, args[0]);
                        const bonus = parseInt(args[1], 10);
                        if (!member || !Number.isInteger(bonus)) return warn(message, 'Usage: `invites bonus add <member> <amount>`');
                        if (!first('SELECT * FROM invites WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id)) {
                            return warn(message, 'This user has not invited anyone.');
                        }
                        run('UPDATE invites SET bonus = bonus + ? WHERE guild_id = ? AND user_id = ?', bonus, message.guild.id, member.id);
                        return approve(message, `${bonus} bonus invites have been added to ${member}`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'invites bonus remove', description: 'Remove bonus invites from a user.', usage: ',invites bonus remove <member> <amount>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const member = parseMember(message, args[0]);
                        const bonus = parseInt(args[1], 10);
                        if (!member || !Number.isInteger(bonus)) return warn(message, 'Usage: `invites bonus remove <member> <amount>`');
                        if (!first('SELECT * FROM invites WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id)) {
                            return warn(message, 'This user has not invited anyone.');
                        }
                        run('UPDATE invites SET bonus = bonus - ? WHERE guild_id = ? AND user_id = ?', bonus, message.guild.id, member.id);
                        return approve(message, `${bonus} bonus invites have been removed from ${member}`);
                    }
                }
            }
        },
        message: {
            aliases: ['msg'],
            data: { name: 'invites message', description: 'Set the message for the invite tracker.', usage: ',invites message <text|none>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const text = args.join(' ').trim();
                if (!text) return warn(message, 'Usage: `invites message <text>`');
                if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                if (text.toLowerCase() === 'none') {
                    run('UPDATE invites_settings SET message = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Invite message has been removed.');
                }
                run('UPDATE invites_settings SET message = ? WHERE guild_id = ?', text, message.guild.id);
                return approve(message, `Invite message has been updated\n\`\`\`${text}\`\`\``);
            }
        },
        logs: {
            aliases: [],
            data: { name: 'invites logs', description: 'Set the channel for the invite logs.', usage: ',invites logs <channel|none>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!args[0]) return warn(message, 'Usage: `invites logs <channel>`');
                if (!needsEnabled(message, first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id))) return;
                if (String(args[0]).toLowerCase() === 'none') {
                    run('UPDATE invites_settings SET logs = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Invite logs channel has been removed');
                }
                const channel = parseChannel(message, args[0]);
                if (!channel) return warn(message, 'Usage: `invites logs <channel>`');
                run('UPDATE invites_settings SET logs = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Invite logs channel has been updated to ${channel}`);
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'invites leaderboard', description: 'Show the invite leaderboard for the server.', usage: ',invites leaderboard' },
            execute: async (message, args, client) => {
                if (!first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Invite tracking is not enabled.');
                }
                const rows = query('SELECT * FROM invites WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'Nobody invited someone to show a leaderboard.');
                const entries = rows.map(record => ({
                    userId: String(record.user_id),
                    total: Number(record.regular_count || 0) + Number(record.bonus || 0),
                    regular: Number(record.regular_count || 0),
                    left: Number(record.left_count || 0),
                    fake: Number(record.fake_count || 0),
                    bonus: Number(record.bonus || 0)
                }));
                entries.sort((a, b) => b.total - a.total);
                const lines = entries.map(entry =>
                    `<@${entry.userId}> - **${entry.total}** invites (${entry.regular} **regular**, ${entry.left} **left**, ${entry.fake} **fake**, ${entry.bonus} **bonus**)`);
                return paginate(message, lines, 'Invite Leaderboard', { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        },
        inviter: {
            aliases: ['invited-by'],
            data: { name: 'invites inviter', description: 'Show who invited the user to the server.', usage: ',invites inviter <member>' },
            execute: async (message, args) => {
                const member = parseMember(message, args[0]);
                if (!member) return warn(message, 'Usage: `invites inviter <member>`');
                const row = first('SELECT * FROM invites_users WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                if (!row) return warn(message, 'This user was not invited by anyone.');
                const inviterId = String(row.inviter_id);
                const inviter = message.guild.members.cache.get(inviterId) || await message.client.users.fetch(inviterId).catch(() => null);
                const stamp = Math.floor(Number(row.timestamp || 0));
                return message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `💌 ${member} was invited by ${inviter || `<@${inviterId}>`} <t:${stamp}:R>` })] });
            }
        },
        invited: {
            aliases: [],
            data: { name: 'invites invited', description: 'Returns a list where all users are listed who got invited by the provided user', usage: ',invites invited <member>' },
            execute: async (message, args) => {
                const member = parseMember(message, args[0]);
                if (!member) return warn(message, 'Usage: `invites invited <member>`');
                const rows = query('SELECT * FROM invites_users WHERE guild_id = ? AND inviter_id = ?', message.guild.id, member.id);
                if (!rows.length) return warn(message, "This user hasn't invited anyone to the server");
                const lines = rows.map(entry => {
                    const id = String(entry.user_id);
                    const guildMember = message.guild.members.cache.get(id);
                    return guildMember ? `<@${id}> (**${guildMember.user.username}**)` : `<@${id}>`;
                });
                return paginate(message, lines, `Invited Users by ${member.user.username}`, { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        },
        code: {
            aliases: [],
            data: { name: 'invites code', description: "Display all of your or a user's invite codes.", usage: ',invites code [member]' },
            execute: async (message, args, client) => {
                const member = parseMember(message, args[0]);
                if (!member) return warn(message, 'Usage: `invites code [member]`');
                const codes = await message.guild.invites.fetch().catch(() => null);
                if (!codes) return warn(message, 'I could not fetch the server invites.');
                const mine = codes.filter(invite => invite.inviter && invite.inviter.id === member.id).map(invite => invite);
                if (!mine.length) return warn(message, `${member} has not created any invites.`);
                const lines = mine.map(invite => `**${invite.code}** - ${invite.uses || 0} uses`);
                return paginate(message, lines, `${member.user.username}'s Invite Codes`, { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        }
    }
};
