const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm, prefix } = require('../../utils/moderation');
const { needLeveling } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');
const { newRole, humanizeRole } = require('../../utils/roleGuard');
const { setLevelData, resetLevelData, giveRewards, targetXpFor } = require('../../utils/levels');
const { COLORS, EMOJIS } = require('../../utils/styles');

const MULTIPLIERS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
const SYNC_COOLDOWNS = new Map();

function validMultiplier(text) {
    const value = parseFloat(text);
    if (isNaN(value)) return null;
    return MULTIPLIERS.includes(value) ? value : 'invalid';
}

function multiplierWarn() {
    return `Multiplier can only be \`0.25\`, \`0.50\`, \`0.75\`, \`1.00\`, \`1.25\`, \`1.50\`, \`1.75\`, \`2.00\`, \`2.25\`, \`2.50\`, \`2.75\` or \`3.00\``;
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

function resolveTarget(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const role = message.mentions.roles.first();
    if (role) return { column: 'roles', id: role.id, mention: `${role}` };
    const channel = message.mentions.channels.first();
    if (channel) return { column: 'channels', id: channel.id, mention: `${channel}` };
    const user = message.mentions.users.first();
    if (user) return { column: 'users', id: user.id, mention: `${user}` };
    const id = raw.replace(/[<@!&>#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const member = message.guild.members.cache.get(id);
        if (member) return { column: 'users', id: member.id, mention: `${member}` };
        const byRole = message.guild.roles.cache.get(id);
        if (byRole) return { column: 'roles', id: byRole.id, mention: `${byRole}` };
        const byChannel = message.guild.channels.cache.get(id);
        if (byChannel) return { column: 'channels', id: byChannel.id, mention: `${byChannel}` };
        return { column: 'users', id, mention: `<@${id}>` };
    }
    const byName = message.guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase());
    if (byName) return { column: 'roles', id: byName.id, mention: `${byName}` };
    const byChannelName = message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase());
    if (byChannelName) return { column: 'channels', id: byChannelName.id, mention: `${byChannelName}` };
    const member = message.guild.members.cache.find(m => m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase());
    if (member) return { column: 'users', id: member.id, mention: `${member}` };
    return null;
}

function parseList(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

async function updateBlacklist(message, column, itemId, add) {
    const current = first(`SELECT ${column} FROM leveling WHERE guild_id = ?`, message.guild.id);
    const list = parseList(current ? current[column] : null);
    const mention = column === 'roles'
        ? (message.guild.roles.cache.get(String(itemId)) || `<@&${itemId}>`)
        : column === 'channels'
            ? (message.guild.channels.cache.get(String(itemId)) || `<#${itemId}>`)
            : (message.guild.members.cache.get(String(itemId)) || `<@${itemId}>`);
    if (add) {
        if (list.map(String).includes(String(itemId))) return warn(message, `This ${column.slice(0, -1)} is already ignored`);
        list.push(String(itemId));
        await run(`UPDATE leveling SET ${column} = ? WHERE guild_id = ?`, JSON.stringify(list), message.guild.id);
        return approve(message, `Added ${column.slice(0, -1)} ${mention} to ignore list`);
    }
    if (!list.map(String).includes(String(itemId))) return warn(message, `This ${column.slice(0, -1)} is not ignored`);
    const next = list.filter(id => String(id) !== String(itemId));
    await run(`UPDATE leveling SET ${column} = ? WHERE guild_id = ?`, JSON.stringify(next), message.guild.id);
    return approve(message, `Removed ${column.slice(0, -1)} ${mention} from the ignore list`);
}

module.exports = {
    data: {
        name: 'level',
        description: 'Setup the leveling module',
        usage: ',level <test|enable|disable|channel|message|booster|multiplier|rolemultiplier|voice|multipliers|config|set|reset|leaderboard|rewards|ignore>'
    },
    aliases: [],
    cooldown: 3,
    subcommands: ['test', 'enable', 'disable', 'channel', 'message', 'booster', 'multiplier', 'rolemultiplier', 'voice', 'multipliers', 'config', 'set', 'reset', 'leaderboard', 'rewards', 'ignore'],
    subUsages: {
        test: ',level test',
        enable: ',level enable',
        disable: ',level disable',
        channel: ',level channel <#channel|any|dm>',
        message: ',level message <text|none>',
        booster: ',level booster <multiplier>',
        multiplier: ',level multiplier <multiplier>',
        rolemultiplier: ',level rolemultiplier <add|remove>',
        voice: ',level voice <booster|multiplier|rolemultiplier>',
        multipliers: ',level multipliers',
        config: ',level config',
        set: ',level set <user> <level>',
        reset: ',level reset [user]',
        leaderboard: ',level leaderboard',
        rewards: ',level rewards <add|remove|reset|list|stack|sync>',
        ignore: ',level ignore <add|remove|command|list>'
    },

    async execute(message, args, client, config) {
        return require('../utility/rank').execute(message, args, client, config);
    },

    subs: {
        test: {
            aliases: [],
            data: { name: 'level test', description: 'View the level up message for the server', usage: ',level test' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const res = first('SELECT * FROM leveling WHERE guild_id = ?', message.guild.id);
                if (!res) return warn(message, 'Leveling is not configured for this server.');
                const channel = (res.channel_id && message.guild.channels.cache.get(String(res.channel_id))) || message.channel;
                const { altConvert, scriptPayload } = require('../../utils/embedScript');
                const { levelReplace } = require('../../utils/levels');
                const replaced = await levelReplace(message.member, res.message);
                let payload;
                try {
                    payload = scriptPayload(altConvert(message.member, replaced));
                } catch (err) {
                    return warn(message, `An error occurred while sending the message\n\`\`\`${err.message}\`\`\``);
                }
                try {
                    const sent = await channel.send(payload);
                    return approve(message, `Sent the message ${sent.url}`);
                } catch (err) {
                    return warn(message, `An error occurred while sending the message\n\`\`\`${err.message}\`\`\``);
                }
            }
        },

        enable: {
            aliases: [],
            data: { name: 'level enable', description: 'Enable the leveling system', usage: ',level enable' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const existing = first('SELECT 1 AS ok FROM leveling WHERE guild_id = ?', message.guild.id);
                if (existing) return warn(message, 'Leveling system is **already** enabled');
                run('INSERT INTO leveling (guild_id, message) VALUES (?, ?)', message.guild.id, 'Good job, {user}! You leveled up to **Level {level}**');
                return approve(message, 'Enabled the leveling system');
            }
        },

        disable: {
            aliases: [],
            data: { name: 'level disable', description: 'Disable the leveling system', usage: ',level disable' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **reset** the leveling system? This will reset the level statistics aswell`,
                    async (interaction) => {
                        run('DELETE FROM leveling WHERE guild_id = ?', message.guild.id);
                        run('DELETE FROM level_user WHERE guild_id = ?', message.guild.id);
                        await interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Disabled the leveling system` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        await interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Leveling system deactivation got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        channel: {
            aliases: [],
            data: { name: 'level channel', description: 'Set a channel for the level up messages', usage: ',level channel <#channel|any|dm>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const input = args.join(' ').trim();
                const lower = input.toLowerCase();
                if (lower === 'any') {
                    run('UPDATE leveling SET channel_id = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Level up messages are going to be sent in any channel');
                }
                if (lower === 'dm') {
                    run('UPDATE leveling SET channel_id = 0 WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Level up messages are going to be sent in DMs');
                }
                const channel = message.mentions.channels.first() ||
                    (/^\d{17,20}$/.test(input) ? message.guild.channels.cache.get(input.replace(/[<#>]/g, '')) : null);
                if (!channel) return warn(message, 'Invalid channel option. Valid options are: `any`, `dm`, or a valid channel mention');
                run('UPDATE leveling SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Level up messages are going to be sent in ${channel}`);
            }
        },

        message: {
            aliases: [],
            data: { name: 'level message', description: 'Set a custom level up message', usage: ',level message <text|none>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const text = args.join(' ').trim() || 'Good job, {user}! You leveled up to **Level {level}**';
                if (text.toLowerCase() === 'none') {
                    run('UPDATE leveling SET message = ? WHERE guild_id = ?', 'none', message.guild.id);
                    return approve(message, 'Removed the **level up** message');
                }
                run('UPDATE leveling SET message = ? WHERE guild_id = ?', text, message.guild.id);
                return approve(message, `Level up message configured to:\n\`\`\`${text}\`\`\``);
            }
        },

        booster: {
            aliases: [],
            data: { name: 'level booster', description: 'Set the multiplier for boosters', usage: ',level booster <multiplier>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const multiplier = validMultiplier(args[0]);
                if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                run('UPDATE leveling SET booster = ? WHERE guild_id = ?', multiplier, message.guild.id);
                return approve(message, `Set the booster multiplier to **${multiplier.toFixed(2)}**`);
            }
        },

        multiplier: {
            aliases: [],
            data: { name: 'level multiplier', description: 'Set the multiplier for the leveling system', usage: ',level multiplier <multiplier>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const multiplier = validMultiplier(args[0]);
                if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                run('UPDATE leveling SET multiplier = ? WHERE guild_id = ?', multiplier, message.guild.id);
                return approve(message, `Set the multiplier to **${multiplier.toFixed(2)}**`);
            }
        },

        rolemultiplier: {
            aliases: ['rmulti', 'rmultiplier'],
            data: { name: 'level rolemultiplier', description: 'Manage the role multipliers', usage: ',level rolemultiplier <add|remove>' },
            subcommands: ['add', 'remove'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                return sendCard(message, module.exports.subs.rolemultiplier);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'level rolemultiplier add', description: 'Add or update a role multiplier', usage: ',level rolemultiplier add <role> <multiplier>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needLeveling(message, config)) return;
                        const role = message.mentions.roles.first() || (/^\d{17,20}$/.test(args[0] || '') ? message.guild.roles.cache.get(args[0]) : null) ||
                            message.guild.roles.cache.find(r => r.name.toLowerCase() === args[0].toLowerCase());
                        if (!role) return warn(message, `Role **${args[0] || ''}** couldn't be found`);
                        const multiplier = validMultiplier(args[1]);
                        if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                        const existing = first('SELECT 1 AS ok FROM level_multiplier WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (existing) run('UPDATE level_multiplier SET multiplier = ? WHERE guild_id = ? AND role_id = ?', multiplier, message.guild.id, role.id);
                        else run('INSERT INTO level_multiplier (guild_id, role_id, multiplier) VALUES (?, ?, ?)', message.guild.id, role.id, multiplier);
                        return approve(message, `Set the multiplier for role **${role.name}** to **${multiplier.toFixed(2)}**`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'level rolemultiplier remove', description: 'Remove a role multiplier', usage: ',level rolemultiplier remove <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needLeveling(message, config)) return;
                        const role = message.mentions.roles.first() || (/^\d{17,20}$/.test(args[0] || '') ? message.guild.roles.cache.get(args[0]) : null) ||
                            message.guild.roles.cache.find(r => r.name.toLowerCase() === (args[0] || '').toLowerCase());
                        if (!role) return warn(message, `Role **${args[0] || ''}** couldn't be found`);
                        const result = first('SELECT 1 AS ok FROM level_multiplier WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (!result) return warn(message, `No multiplier found for role **${role.name}**.`);
                        run('DELETE FROM level_multiplier WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        return approve(message, `Removed the multiplier for role ${role}`);
                    }
                }
            }
        },

        voice: {
            aliases: [],
            data: { name: 'level voice', description: 'Manage voice mulipliers for leveling system', usage: ',level voice <booster|multiplier|rolemultiplier>' },
            subcommands: ['booster', 'multiplier', 'rolemultiplier'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                return sendCard(message, module.exports.subs.voice);
            },
            subs: {
                booster: {
                    aliases: [],
                    data: { name: 'level voice booster', description: 'Set the voice multiplier for boosters', usage: ',level voice booster <multiplier>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needLeveling(message, config)) return;
                        const multiplier = validMultiplier(args[0]);
                        if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                        run('UPDATE leveling SET voice_booster = ? WHERE guild_id = ?', multiplier, message.guild.id);
                        return approve(message, `Set the booster voice multiplier to **${multiplier.toFixed(2)}**`);
                    }
                },
                multiplier: {
                    aliases: [],
                    data: { name: 'level voice multiplier', description: 'Set the voice multiplier for the leveling system', usage: ',level voice multiplier <multiplier>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needLeveling(message, config)) return;
                        const multiplier = validMultiplier(args[0]);
                        if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                        run('UPDATE leveling SET voice_multiplier = ? WHERE guild_id = ?', multiplier, message.guild.id);
                        return approve(message, `Set the multiplier to **${multiplier.toFixed(2)}**`);
                    }
                },
                rolemultiplier: {
                    aliases: ['rmulti', 'rmultiplier'],
                    data: { name: 'level voice rolemultiplier', description: 'Manage the role voice multipliers', usage: ',level voice rolemultiplier <add|remove>' },
                    subcommands: ['add', 'remove'],
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!await needLeveling(message, config)) return;
                        return sendCard(message, module.exports.subs.voice.subs.rolemultiplier);
                    },
                    subs: {
                        add: {
                            aliases: [],
                            data: { name: 'level voice rolemultiplier add', description: 'Add or update a role voice multiplier', usage: ',level voice rolemultiplier add <role> <multiplier>' },
                            async execute(message, args, client, config) {
                                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                                if (!await needLeveling(message, config)) return;
                                const role = message.mentions.roles.first() || (/^\d{17,20}$/.test(args[0] || '') ? message.guild.roles.cache.get(args[0]) : null) ||
                                    message.guild.roles.cache.find(r => r.name.toLowerCase() === (args[0] || '').toLowerCase());
                                if (!role) return warn(message, `Role **${args[0] || ''}** couldn't be found`);
                                const multiplier = validMultiplier(args[1]);
                                if (multiplier === null || multiplier === 'invalid') return warn(message, multiplierWarn());
                                const existing = first('SELECT 1 AS ok FROM level_multiplier_voice WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                                if (existing) run('UPDATE level_multiplier_voice SET multiplier = ? WHERE guild_id = ? AND role_id = ?', multiplier, message.guild.id, role.id);
                                else run('INSERT INTO level_multiplier_voice (guild_id, role_id, multiplier) VALUES (?, ?, ?)', message.guild.id, role.id, multiplier);
                                return approve(message, `Set the multiplier for role **${role.name}** to **${multiplier.toFixed(2)}**`);
                            }
                        },
                        remove: {
                            aliases: [],
                            data: { name: 'level voice rolemultiplier remove', description: 'Remove a role voice multiplier', usage: ',level voice rolemultiplier remove <role>' },
                            async execute(message, args, client, config) {
                                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                                if (!await needLeveling(message, config)) return;
                                const role = message.mentions.roles.first() || (/^\d{17,20}$/.test(args[0] || '') ? message.guild.roles.cache.get(args[0]) : null) ||
                                    message.guild.roles.cache.find(r => r.name.toLowerCase() === (args[0] || '').toLowerCase());
                                if (!role) return warn(message, `Role **${args[0] || ''}** couldn't be found`);
                                const result = first('SELECT 1 AS ok FROM level_multiplier_voice WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                                if (!result) return warn(message, `No voice multiplier found for role **${role.name}**`);
                                run('DELETE FROM level_multiplier_voice WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                                return approve(message, `Removed the voice multiplier for role ${role}`);
                            }
                        }
                    }
                }
            }
        },

        multipliers: {
            aliases: ['multis'],
            data: { name: 'level multipliers', description: 'Displays the current multipliers for the server', usage: ',level multipliers' },
            async execute(message, args, client, config) {
                if (!await needLeveling(message, config)) return;
                const res = first('SELECT * FROM leveling WHERE guild_id = ?', message.guild.id);
                const globalMultiplier = res && res.multiplier != null ? res.multiplier : 1;
                const boosterMultiplier = res && res.booster != null ? res.booster : 1;
                const globalVoice = res && res.voice_multiplier != null ? res.voice_multiplier : 1;
                const boosterVoice = res && res.voice_booster != null ? res.voice_booster : 1;
                const roleMultipliers = query('SELECT role_id, multiplier FROM level_multiplier WHERE guild_id = ?', message.guild.id) || [];
                const roleVoiceMultipliers = query('SELECT role_id, multiplier FROM level_multiplier_voice WHERE guild_id = ?', message.guild.id) || [];
                const roleLines = rows => rows.length
                    ? rows.map(row => `${humanizeRole(message.guild, row.role_id)} - ${Number(row.multiplier).toFixed(2)}`).join('\n')
                    : 'No role multipliers set.';
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: 'Multipliers for Server',
                        author: { name: message.guild.name, icon_url: message.guild.iconURL() },
                        fields: [
                            { name: 'Global Multiplier', value: Number(globalMultiplier).toFixed(2), inline: true },
                            { name: 'Booster Multiplier', value: Number(boosterMultiplier).toFixed(2), inline: true },
                            { name: 'Role Multipliers', value: roleLines(roleMultipliers), inline: false },
                            { name: 'Global Voice Multiplier', value: Number(globalVoice).toFixed(2), inline: true },
                            { name: 'Booster Voice Multiplier', value: Number(boosterVoice).toFixed(2), inline: true },
                            { name: 'Role Voice Multipliers', value: roleLines(roleVoiceMultipliers), inline: false }
                        ]
                    }]
                });
            }
        },

        config: {
            aliases: ['settings', 'stats', 'statistics', 'status'],
            data: { name: 'level config', description: 'Check the settings for the leveling system', usage: ',level config' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const check = first('SELECT * FROM leveling WHERE guild_id = ?', message.guild.id);
                const voice = first('SELECT level_state FROM voicetrack_settings WHERE guild_id = ?', message.guild.id);
                const linked = check && check.channel_id ? message.guild.channels.cache.get(String(check.channel_id)) : null;
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        author: { name: `${message.guild.name}'s Leveling Config`, icon_url: message.guild.iconURL() },
                        fields: [
                            { name: 'Channel', value: linked ? `${linked}` : `${EMOJIS.DENY}`, inline: true },
                            { name: 'Stackroles', value: check && check.stack ? `${EMOJIS.APPROVE}` : `${EMOJIS.DENY}`, inline: true },
                            { name: 'Voice Level', value: voice && voice.level_state ? `${EMOJIS.APPROVE}` : `${EMOJIS.DENY}`, inline: true },
                            { name: 'Message', value: check ? String(check.message) : '`none`', inline: false }
                        ]
                    }]
                });
            }
        },

        set: {
            aliases: [],
            data: { name: 'level set', description: "Set a user's level", usage: ',level set <user> <level>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const member = resolveMember(message, args[0]);
                if (!member) return warn(message, `Member **${args[0] || ''}** couldn't be found`);
                const level = parseInt(args[1], 10);
                if (isNaN(level)) return warn(message, 'You must provide a valid level');
                if (level < 1) return warn(message, "The level can't be **lower** than 0");
                if (level > 1000) return warn(message, "The level can't be **higher** than 1,000");
                setLevelData(message.guild.id, member.id, level, 0);
                await approve(message, `Set the level for ${member} to **Level ${level}**`);
                await giveRewards(member, level);
            }
        },

        reset: {
            aliases: [],
            data: { name: 'level reset', description: "Reset a user's level and XP", usage: ',level reset [user]' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needLeveling(message, config)) return;
                const member = args.length ? resolveMember(message, args.join(' ')) : null;
                if (args.length && !member) return warn(message, `Member **${args.join(' ')}** couldn't be found`);
                if (!member) {
                    return confirm(message,
                        `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **reset** level statistics for everyone in this server?`,
                        async (interaction) => {
                            resetLevelData(message.guild.id);
                            await interaction.update({
                                embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Reset level statistics for **all** members` }],
                                components: []
                            }).catch(() => {});
                        },
                        async (interaction) => {
                            await interaction.update({
                                embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Leveling system reset got canceled` }],
                                components: []
                            }).catch(() => {});
                        });
                }
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **reset** level statistics for ${member} in this server?`,
                    async (interaction) => {
                        resetLevelData(message.guild.id, member.id);
                        await interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Reset level statistics for ${member}` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        await interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Leveling system reset got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        leaderboard: {
            aliases: ['lb'],
            data: { name: 'level leaderboard', description: 'View the highest-ranking members', usage: ',level leaderboard' },
            async execute(message, args, client, config) {
                if (!await needLeveling(message, config)) return;
                const results = query('SELECT user_id, xp, level, target_xp FROM level_user WHERE guild_id = ?', message.guild.id) || [];
                const memberIds = new Set(message.guild.members.cache.map(m => m.id));
                const filtered = results.filter(row => memberIds.has(String(row.user_id)));
                if (!filtered.length) return warn(message, 'No members have been ranked yet.');
                filtered.sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
                const lines = filtered.map(row => {
                    const user = message.client.users.cache.get(String(row.user_id)) || row.user_id;
                    return `**${user}** has level **${row.level}** (\`${Number(row.xp).toLocaleString('en-US')}\`/\`${Number(row.target_xp).toLocaleString('en-US')}\`)`;
                });
                return paginate(message, lines, 'Level leaderboard', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        },

        rewards: {
            aliases: [],
            data: { name: 'level rewards', description: 'Manage the rewards for leveling up', usage: ',level rewards <add|remove|reset|list|stack|sync>' },
            subcommands: ['add', 'remove', 'reset', 'list', 'stack', 'sync'],
            async execute(message, args, client, config) {
                if (!await needLeveling(message, config)) return;
                return sendCard(message, module.exports.subs.rewards);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'level rewards add', description: 'Assign a reward role to a level', usage: ',level rewards add <level> <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const level = parseInt(args[0], 10);
                        if (isNaN(level)) return warn(message, 'You must provide a valid level');
                        if (level < 0) return warn(message, "Level can't be lower than 0");
                        const { role, error } = await newRole(message, args.slice(1).join(' '), config);
                        if (!role) return warn(message, error);
                        const check = first('SELECT level FROM level_rewards WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (check) return warn(message, `This role is **already** a reward for **Level ${check.level}**`);
                        run('INSERT INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?)', message.guild.id, level, role.id);
                        return approve(message, `Added ${role} as a reward for reaching **Level ${level}**`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'level rewards remove', description: 'Remove a reward from a level', usage: ',level rewards remove <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const { role, error } = await newRole(message, args.join(' '), config);
                        if (!role) return warn(message, error);
                        const check = first('SELECT level FROM level_rewards WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        if (!check) return warn(message, 'This role is **not** a reward for any level');
                        run('DELETE FROM level_rewards WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                        return approve(message, `Removed a reward for reaching **Level ${check.level}**`);
                    }
                },
                reset: {
                    aliases: [],
                    data: { name: 'level rewards reset', description: 'Remove every reward that was added', usage: ',level rewards reset' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        return confirm(message,
                            `${EMOJIS.QUESTION} ${message.author}: Are you sure that you want to **remove** every reward saved in this server?`,
                            async (interaction) => {
                                run('DELETE FROM level_rewards WHERE guild_id = ?', message.guild.id);
                                await interaction.update({
                                    embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Removed every reward that was saved in this server` }],
                                    components: []
                                }).catch(() => {});
                            },
                            async (interaction) => {
                                await interaction.update({
                                    embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Leveling reward deletion got canceled` }],
                                    components: []
                                }).catch(() => {});
                            });
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'level rewards list', description: 'Get a list of every role reward in this server', usage: ',level rewards list' },
                    async execute(message, args, client, config) {
                        const check = query('SELECT role_id, level FROM level_rewards WHERE guild_id = ?', message.guild.id) || [];
                        if (!check.length) return warn(message, 'There are no level rewards set');
                        check.sort((a, b) => a.level - b.level);
                        const lines = check.map(row => `${humanizeRole(message.guild, row.role_id)} for **Level ${row.level}**`);
                        return paginate(message, lines, 'Level rewards', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL()
                        });
                    }
                },
                stack: {
                    aliases: [],
                    data: { name: 'level rewards stack', description: 'Toggle stacking rewards for leveling up', usage: ',level rewards stack <on|off>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const option = (args[0] || '').toLowerCase();
                        if (option === 'off') {
                            run('UPDATE leveling SET stack = 0 WHERE guild_id = ?', message.guild.id);
                            return approve(message, 'Disabled stacking rewards for leveling up');
                        }
                        if (option === 'on') {
                            run('UPDATE leveling SET stack = 1 WHERE guild_id = ?', message.guild.id);
                            return approve(message, 'Enabled stacking rewards for leveling up');
                        }
                        return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                    }
                },
                sync: {
                    aliases: [],
                    data: { name: 'level rewards sync', description: "Sync all user's roles based on their levels", usage: ',level rewards sync' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const now = Date.now();
                        const last = SYNC_COOLDOWNS.get(message.guild.id) || 0;
                        if (now - last < 3600000) {
                            const wait = Math.ceil((3600000 - (now - last)) / 60000);
                            return warn(message, `You are on cooldown, try again in **${wait}m**`);
                        }
                        const levelRewards = query('SELECT level, role_id FROM level_rewards WHERE guild_id = ?', message.guild.id) || [];
                        if (!levelRewards.length) return warn(message, 'There are no level rewards configured for this server');
                        const usersLevels = query('SELECT user_id, level FROM level_user WHERE guild_id = ?', message.guild.id) || [];
                        if (!usersLevels.length) return warn(message, 'No user levels found for this server.');
                        SYNC_COOLDOWNS.set(message.guild.id, now);
                        const loading = await message.reply({
                            embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Synchronizing all users roles with their levels...` }]
                        });
                        for (let i = 0; i < usersLevels.length; i += 5) {
                            const batch = usersLevels.slice(i, i + 5);
                            for (const row of batch) {
                                const member = message.guild.members.cache.get(String(row.user_id));
                                if (!member) continue;
                                await giveRewards(member, row.level || 0);
                            }
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                        return loading.edit({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: All users roles have been synchronized based on their levels` }]
                        }).catch(() => {});
                    }
                }
            }
        },

        ignore: {
            aliases: [],
            data: { name: 'level ignore', description: 'Manage the XP ignore list', usage: ',level ignore <add|remove|command|list>' },
            subcommands: ['add', 'remove', 'command', 'list'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.ignore);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'level ignore add', description: 'Add a user, role or channel to the XP ignore list', usage: ',level ignore add <user|role|channel>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = resolveTarget(message, args.join(' '));
                        if (!target) return warn(message, 'You must mention a user, role or channel');
                        return updateBlacklist(message, target.column, target.id, true);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'level ignore remove', description: 'Remove a user, role or channel from the XP ignore list', usage: ',level ignore remove <user|role|channel>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = resolveTarget(message, args.join(' '));
                        if (!target) return warn(message, 'You must mention a user, role or channel');
                        return updateBlacklist(message, target.column, target.id, false);
                    }
                },
                command: {
                    aliases: [],
                    data: { name: 'level ignore command', description: 'Enable or disable the option to exclude commands from the leveling system', usage: ',level ignore command <on|off>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const option = (args[0] || '').toLowerCase();
                        if (option === 'on') {
                            run('UPDATE leveling SET command = 1 WHERE guild_id = ?', message.guild.id);
                            return approve(message, 'Commands now ignored for leveling');
                        }
                        if (option === 'off') {
                            run('UPDATE leveling SET command = 0 WHERE guild_id = ?', message.guild.id);
                            return approve(message, 'Command not ignored for leveling anymore');
                        }
                        return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'level ignore list', description: 'View the XP ignore list', usage: ',level ignore list' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const row = first('SELECT users, roles, channels FROM leveling WHERE guild_id = ?', message.guild.id);
                        const content = [];
                        if (row) {
                            for (const id of parseList(row.users)) content.push(`<@${id}>`);
                            for (const id of parseList(row.roles)) content.push(`<@&${id}>`);
                            for (const id of parseList(row.channels)) content.push(`<#${id}>`);
                        }
                        if (!content.length) return warn(message, 'No users, roles, or channels are ignored for XP');
                        return paginate(message, content, 'Level Blacklisted', {
                            name: message.guild.name,
                            icon_url: message.guild.iconURL()
                        });
                    }
                }
            }
        }
    }
};
