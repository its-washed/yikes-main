const { PermissionFlagsBits, AutoModerationRuleTriggerType, AutoModerationRuleEventType, AutoModerationActionType, ChannelType } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { needAntispam, needAntirepeat } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');
const { humanizeTime } = require('../../utils/helpers');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { applyDescriptions } = require('../../utils/helpers');

const INVITE_REGEX = ['(https?://)?(www.)?(discord.(gg|io|me|li)|discordapp.com/invite|discord.com/invite)/.+[a-z]'];

function parseList(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (err) {
        return [];
    }
}

function findRole(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.roles.cache.get(id) || null;
    return message.guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase()) || null;
}

function findChannel(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return null;
}

function findUser(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const member = message.guild.members.cache.get(id);
        if (member) return member.user;
        return message.client.users.cache.get(id) || null;
    }
    return null;
}

function resolveTarget(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const role = message.mentions.roles.first();
    if (role) return { type: 'role', value: role };
    const channel = message.mentions.channels.first();
    if (channel) return { type: 'channel', value: channel };
    const user = message.mentions.users.first();
    if (user) return { type: 'user', value: user };
    const id = raw.replace(/[<@!&>#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byRole = message.guild.roles.cache.get(id);
        if (byRole) return { type: 'role', value: byRole };
        const byChannel = message.guild.channels.cache.get(id);
        if (byChannel) return { type: 'channel', value: byChannel };
        const member = message.guild.members.cache.get(id);
        if (member) return { type: 'user', value: member.user };
        const byUser = message.client.users.cache.get(id);
        if (byUser) return { type: 'user', value: byUser };
    }
    return null;
}

async function fetchRule(message, mode) {
    const row = first('SELECT * FROM automod_rules WHERE guild_id = ? AND mode = ?', message.guild.id, mode);
    if (!row) {
        await warn(message, `Automod **${mode}** is not enabled.`);
        return null;
    }
    let rule = null;
    try {
        rule = await message.guild.autoModerationRules.fetch(String(row.rule_id));
    } catch (err) {
        rule = null;
    }
    if (!rule) {
        await warn(message, 'Unable to fetch automod rule, please resetup the automod.');
        return null;
    }
    return { row, rule };
}

function inviteWordSubs(mode) {
    const label = mode === 'invites' ? 'invites' : 'words';
    const pretty = label.charAt(0).toUpperCase() + label.slice(1);
    const aliasName = mode === 'invites' ? 'invite' : 'word';

    async function needManageGuild(message) {
        return needPerm(message, PermissionFlagsBits.ManageGuild);
    }

    function ignoreSubs() {
        return {
            add: {
                aliases: [],
                data: { name: `automod ${label} ignore add`, description: `Add a role or channel to the ${label} whitelist`, usage: `automod ${label} ignore add #channel` },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const fetched = await fetchRule(message, mode);
                    if (!fetched) return;
                    const { rule } = fetched;
                    const text = args.join(' ').trim();
                    const role = findRole(message, text);
                    if (role) {
                        if (rule.exemptRoles.cache.has(role.id)) return warn(message, `${role} is **already** ignored.`);
                        try {
                            await rule.edit({ exemptRoles: [...rule.exemptRoles.cache.values(), role], reason: `${pretty} filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `${role} is now ignored.`);
                    }
                    const channel = findChannel(message, text);
                    if (channel) {
                        if (rule.exemptChannels.cache.has(channel.id)) return warn(message, `${channel} is **already** ignored.`);
                        try {
                            await rule.edit({ exemptChannels: [...rule.exemptChannels.cache.values(), channel], reason: `${pretty} filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `${channel} is now ignored.`);
                    }
                    return warn(message, 'Invalid target. Valid targets are: `Role` & `TextChannel`');
                }
            },
            remove: {
                aliases: [],
                data: { name: `automod ${label} ignore remove`, description: `Remove a role or channel from the ${label} whitelist`, usage: `automod ${label} ignore remove #channel` },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const fetched = await fetchRule(message, mode);
                    if (!fetched) return;
                    const { rule } = fetched;
                    const text = args.join(' ').trim();
                    const role = findRole(message, text);
                    if (role) {
                        if (!rule.exemptRoles.cache.has(role.id)) return warn(message, `${role} is **not** ignored.`);
                        try {
                            await rule.edit({ exemptRoles: [...rule.exemptRoles.cache.filter(r => r.id !== role.id).values()], reason: `${pretty} filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `${role} is no longer ignored.`);
                    }
                    const channel = findChannel(message, text);
                    if (channel) {
                        if (!rule.exemptChannels.cache.has(channel.id)) return warn(message, `${channel} is **not** ignored.`);
                        try {
                            await rule.edit({ exemptChannels: [...rule.exemptChannels.cache.filter(c => c.id !== channel.id).values()], reason: `${pretty} filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `${channel} is no longer ignored.`);
                    }
                    return warn(message, 'Invalid target. Valid targets are: `Role` & `TextChannel`');
                }
            },
            list: {
                aliases: [],
                data: { name: `automod ${label} ignore list`, description: `List ignored channels and roles for the ${label} filter`, usage: `automod ${label} ignore list` },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const fetched = await fetchRule(message, mode);
                    if (!fetched) return;
                    const { rule } = fetched;
                    const channels = [...rule.exemptChannels.cache.values()].map(c => `${c} (\`${c.id}\`) - [Text Channel]`);
                    const roles = [...rule.exemptRoles.cache.values()].map(r => `${r} (\`${r.id}\`) - [Role]`);
                    const content = channels.concat(roles);
                    if (!content.length) return warn(message, 'No ignored channels or roles found.');
                    return paginate(message, content, `${message.guild.name}'s Ignored ${pretty}`, {
                        name: message.guild.name,
                        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                    });
                }
            }
        };
    }

    return {
        enable: {
            aliases: ['on'],
            data: { name: `automod ${label} enable`, description: `Enable protection against ${mode === 'invites' ? 'invite links' : 'blacklisted words'}` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const check = first('SELECT 1 AS ok FROM automod_rules WHERE guild_id = ? AND mode = ?', message.guild.id, mode);
                if (check) return warn(message, `Automod **${label}** is already enabled.`);
                let existing = null;
                try {
                    existing = await message.guild.autoModerationRules.fetch();
                } catch (err) {
                    existing = null;
                }
                if (existing) {
                    const keywordRules = existing.filter(rule => rule.triggerType === AutoModerationRuleTriggerType.Keyword);
                    if (keywordRules.size >= 6) {
                        return warn(message, "Discord only allows a maximum of 6 keyword filter rules per server. You've reached this limit.\nYou need to delete an existing rule before adding a new one using `automod delete <rule_id>`.");
                    }
                }
                const botName = message.client.user.name;
                const triggerMetadata = mode === 'invites' ? { regexPatterns: INVITE_REGEX } : undefined;
                try {
                    const rule = await message.guild.autoModerationRules.create({
                        name: `${botName}-anti${mode === 'invites' ? 'invite' : 'word'}`,
                        eventType: AutoModerationRuleEventType.MessageSend,
                        triggerType: AutoModerationRuleTriggerType.Keyword,
                        ...(triggerMetadata ? { triggerMetadata } : {}),
                        actions: [{
                            type: AutoModerationActionType.BlockMessage,
                            metadata: { customMessage: `Message blocked by ${botName} for containing ${mode === 'invites' ? 'an invite link' : 'a blacklisted word'}` }
                        }],
                        enabled: true,
                        reason: `Automod ${label} filter rule created by ${message.author}`
                    });
                    run('INSERT INTO automod_rules (guild_id, rule_id, mode) VALUES (?, ?, ?)', message.guild.id, rule.id, mode);
                    return approve(message, `Automod **${label}** has been enabled.`);
                } catch (err) {
                    return warn(message, `Failed to create automod rule:\n\`\`\`${err.message}\`\`\``);
                }
            }
        },

        disable: {
            aliases: ['off'],
            data: { name: `automod ${label} disable`, description: `Disable the ${label} filter` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const fetched = await fetchRule(message, mode);
                if (!fetched) return;
                try {
                    await fetched.rule.delete(`Automod ${label} filter rule deleted by ${message.author}`);
                } catch (err) {}
                run('DELETE FROM automod_rules WHERE guild_id = ? AND mode = ?', message.guild.id, mode);
                return approve(message, `Automod **${label}** has been disabled.`);
            }
        },

        timeout: {
            aliases: [],
            data: { name: `automod ${label} timeout`, description: `Change timeout duration for members who trigger the ${label} filter`, usage: `automod ${label} timeout 1d` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const raw = String(args[0] || '').trim();
                const time = /^\d+$/.test(raw) ? Number(raw) : parseTime(raw);
                if (time === null || time === undefined) return warn(message, `**${args[0] || ''}** is an invalid timespan\n> Usage: \`automod ${label} timeout <time>\``);
                const fetched = await fetchRule(message, mode);
                if (!fetched) return;
                const actions = time > 0
                    ? [{ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: time } }]
                    : [{ type: AutoModerationActionType.BlockMessage }];
                try {
                    await fetched.rule.edit({ actions, reason: `${pretty} filter rule edited by ${message.author}` });
                } catch (err) {
                    return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                }
                return approve(message, `${pretty} filter timeout has been set to ${humanizeTime(time)}.`);
            }
        },

        message: {
            aliases: ['msg'],
            data: { name: `automod ${label} message`, description: `Set a custom message for the ${label} filter`, usage: `automod ${label} message You are not allowed here.` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const text = args.join(' ').trim();
                if (!text) return warn(message, 'You must provide a message\n> Usage: `automod ' + label + ' message <text>`');
                const fetched = await fetchRule(message, mode);
                if (!fetched) return;
                try {
                    await fetched.rule.edit({
                        actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: text } }],
                        reason: `${pretty} filter rule edited by ${message.author}`
                    });
                } catch (err) {
                    return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                }
                return approve(message, `${pretty} filter message has been updated.`);
            }
        },

        logs: {
            aliases: [],
            data: { name: `automod ${label} logs`, description: `Set the channel where logs will be sent for the ${label} filter`, usage: `automod ${label} logs #logs` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const channel = findChannel(message, args.join(' '));
                if (!channel) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);
                const fetched = await fetchRule(message, mode);
                if (!fetched) return;
                try {
                    await fetched.rule.edit({
                        actions: [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: channel.id } }],
                        reason: `${pretty} filter rule edited by ${message.author}`
                    });
                } catch (err) {
                    return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                }
                return approve(message, `${pretty} filter logs channel has been set to ${channel}.`);
            }
        },

        ignore: {
            aliases: ['exempt'],
            data: { name: `automod ${label} ignore`, description: `Manage ignored channels and roles for the ${label} filter` },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: `automod ${label} ignore add #channel`,
                remove: `automod ${label} ignore remove #channel`,
                list: `automod ${label} ignore list`
            },
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs[mode].subs.ignore, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: ignoreSubs()
        }
    };
}

function spamRepeatSubs(mode) {
    const label = mode === 'spam' ? 'Antispam' : 'Antirepeat';
    const noun = mode === 'spam' ? 'spam' : 'repeat';
    const defaults = mode === 'spam' ? { rate: 8, timeout: 120 } : { rate: 5, timeout: 120 };

    async function needModule(message) {
        return mode === 'spam' ? needAntispam(message) : needAntirepeat(message);
    }

    async function needManageGuild(message) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return false;
        return needModule(message);
    }

    function parseListLocal(value) {
        return parseList(value);
    }

    async function listColumn(message, column) {
        const row = first(`SELECT ${column} FROM automod_${mode} WHERE guild_id = ?`, message.guild.id);
        return parseListLocal(row ? row[column] : null);
    }

    async function setColumn(message, column, list) {
        run(`UPDATE automod_${mode} SET ${column} = ? WHERE guild_id = ?`, JSON.stringify(list), message.guild.id);
    }

    return {
        enable: {
            aliases: ['on'],
            data: { name: `automod ${noun} enable`, description: `Enable protection against message ${noun === 'spam' ? 'spamming' : 'repeating'}` },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first(`SELECT 1 AS ok FROM automod_${mode} WHERE guild_id = ?`, message.guild.id);
                if (check) return warn(message, `${label} is **already** enabled`);
                run(`INSERT INTO automod_${mode} (guild_id, rate, timeout) VALUES (?, ?, ?)`, message.guild.id, defaults.rate, defaults.timeout);
                return approve(message, `${label} is **now** enabled\n> Rate: **${defaults.rate}** messages in **10 seconds** Punishment: **${humanizeTime(defaults.timeout)}** timeout`);
            }
        },

        disable: {
            aliases: ['off'],
            data: { name: `automod ${noun} disable`, description: `Disable protection against message ${noun === 'spam' ? 'spamming' : 'repeating'}` },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needModule(message)) return;
                await confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **disable** the ${label}?`,
                    async (interaction) => {
                        run(`DELETE FROM automod_${mode} WHERE guild_id = ?`, message.guild.id);
                        return interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Disabled the ${label} system` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        return interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: ${label} deactivation got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        rate: {
            aliases: [],
            data: { name: `automod ${noun} rate`, description: `Change rate at which members can send messages in 10 seconds before triggering protection`, usage: `automod ${noun} rate 5` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const rate = parseInt(args[0], 10);
                if (!Number.isFinite(rate)) return warn(message, 'You must provide a valid rate\n> Usage: `automod ' + noun + ' rate <number>`');
                if (rate < 2) return warn(message, "The rate can't be lower than **2**");
                run(`UPDATE automod_${mode} SET rate = ? WHERE guild_id = ?`, rate, message.guild.id);
                return approve(message, `Changed ${noun} rate to **${rate}** messages per **10** seconds`);
            }
        },

        timeout: {
            aliases: [],
            data: { name: `automod ${noun} timeout`, description: `Change timeout duration for members who trigger the ${noun} protection`, usage: `automod ${noun} timeout 1h` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const raw = String(args[0] || '').trim();
                const time = /^\d+$/.test(raw) ? Number(raw) : parseTime(raw);
                if (time === null || time === undefined) return warn(message, `**${args[0] || ''}** is an invalid timespan\n> Usage: \`automod ${noun} timeout <time>\``);
                run(`UPDATE automod_${mode} SET timeout = ? WHERE guild_id = ?`, time, message.guild.id);
                return approve(message, `Changed timeout punishment to **${humanizeTime(time)}**`);
            }
        },

        message: {
            aliases: [],
            data: { name: `automod ${noun} message`, description: "Enable or disable the antispam punishment message", usage: `automod ${noun} message on` },
            async execute(message, args, client, config) {
                if (!await needManageGuild(message)) return;
                const option = String(args[0] || '').toLowerCase();
                if (option !== 'on' && option !== 'off') return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                run(`UPDATE automod_${mode} SET message = ? WHERE guild_id = ?`, option === 'on' ? 1 : 0, message.guild.id);
                return approve(message, `${option === 'on' ? 'Enabled' : 'Disabled'} punishment message for ${label.toLowerCase()} system`);
            }
        },

        ignore: {
            aliases: ['exempt'],
            data: { name: `automod ${noun} ignore`, description: `Manage ignored channels and roles for ${label.toLowerCase()}` },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: `automod ${noun} ignore add #channel`,
                remove: `automod ${noun} ignore remove #channel`,
                list: `automod ${noun} ignore list`
            },
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs[mode].subs.ignore, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: `automod ${noun} ignore add`, description: `Add a user, role or channel to the ${label.toLowerCase()} whitelist`, usage: `automod ${noun} ignore add #channel` },
                    async execute(message, args, client, config) {
                        if (!await needManageGuild(message)) return;
                        const target = resolveTarget(message, args.join(' '));
                        if (!target) return warn(message, 'Invalid target. Valid targets are: `User`, `Role` & `TextChannel`');
                        const column = target.type === 'user' ? 'users' : target.type === 'channel' ? 'channels' : 'roles';
                        const list = await listColumn(message, column);
                        const id = String(target.value.id);
                        if (list.includes(id)) {
                            return warn(message, target.type === 'role'
                                ? `This role is **already** ${label} whitelisted`
                                : `${target.value} is **already** ignored.`);
                        }
                        list.push(id);
                        await setColumn(message, column, list);
                        return approve(message, `${target.value} is now ignored.`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: `automod ${noun} ignore remove`, description: `Remove a user, role or channel from the ${label.toLowerCase()} whitelist`, usage: `automod ${noun} ignore remove #channel` },
                    async execute(message, args, client, config) {
                        if (!await needManageGuild(message)) return;
                        const target = resolveTarget(message, args.join(' '));
                        if (!target) return warn(message, 'Invalid target. Valid targets are: `User`, `Role` & `TextChannel`');
                        const column = target.type === 'user' ? 'users' : target.type === 'channel' ? 'channels' : 'roles';
                        const list = await listColumn(message, column);
                        const id = String(target.value.id);
                        if (!list.includes(id)) {
                            return warn(message, target.type === 'role'
                                ? `This role is **not** ${label} whitelisted`
                                : `${target.value} is **not** ignored.`);
                        }
                        await setColumn(message, column, list.filter(entry => entry !== id));
                        return approve(message, `${target.value} is no longer ignored.`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: `automod ${noun} ignore list`, description: `List ignored users, channels and roles for ${label.toLowerCase()}` },
                    async execute(message, args, client, config) {
                        if (!await needManageGuild(message)) return;
                        const users = await listColumn(message, 'users');
                        const channels = await listColumn(message, 'channels');
                        const roles = await listColumn(message, 'roles');
                        const content = [
                            ...users.map(user => `<@${user}> (\`${user}\`) - [User]`),
                            ...channels.map(channel => `<#${channel}> (\`${channel}\`) - [Text Channel]`),
                            ...roles.map(role => `<@&${role}> (\`${role}\`) - [Role]`)
                        ];
                        if (!content.length) return warn(message, 'No ignored users, channels or roles found.');
                        return paginate(message, content, `${message.guild.name}'s Ignored ${label}`, {
                            name: message.guild.name,
                            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                        });
                    }
                }
            }
        }
    };
}

module.exports = {
    permission: "manage guild",
    data: {
        name: 'automod',
        description: 'Manage automod settings for your server',
        usage: ',automod <invites|words|spam|repeat>'
    },
    aliases: [],
    cooldown: 3,
    subcommands: ['invites', 'words', 'spam', 'repeat'],
    subUsages: {
        invites: ',automod invites <enable|disable|timeout|message|logs|ignore>',
        words: ',automod words <enable|disable|timeout|message|logs|add|remove|clear|list|ignore>',
        spam: ',automod spam <enable|disable|rate|timeout|message|ignore>',
        repeat: ',automod repeat <enable|disable|rate|timeout|message|ignore>'
    },

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        invites: {
            aliases: ['invite'],
            data: { name: 'automod invites', description: 'Prevent members from sending invite links' },
            subcommands: ['enable', 'disable', 'timeout', 'message', 'logs', 'ignore'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.invites, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: inviteWordSubs('invites')
        },
        words: {
            aliases: ['word'],
            data: { name: 'automod words', description: 'Prevent members from using blacklisted words' },
            subcommands: ['enable', 'disable', 'timeout', 'message', 'logs', 'add', 'remove', 'clear', 'list', 'ignore'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.words, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: Object.assign(inviteWordSubs('words'), {
                add: {
                    aliases: [],
                    data: { name: 'automod words add', description: 'Add a blacklisted word to the words filter', usage: 'automod words add word' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const word = args.join(' ').trim();
                        if (!word) return warn(message, 'You must provide a word\n> Usage: `automod words add <word>`');
                        if (word.length > 60) return warn(message, 'Word must be less than 60 characters.');
                        const fetched = await fetchRule(message, 'words');
                        if (!fetched) return;
                        const filters = [...(fetched.rule.triggerMetadata.keywordFilter || [])];
                        if (filters.includes(`*${word}*`)) return warn(message, `Word \`${word}\` is already blacklisted.`);
                        filters.push(`*${word}*`);
                        try {
                            await fetched.rule.edit({ triggerMetadata: { keywordFilter: filters }, reason: `Words filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `Word \`${word}\` has been blacklisted.`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'automod words remove', description: 'Remove a blacklisted word from the words filter', usage: 'automod words remove word' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const word = args.join(' ').trim();
                        if (!word) return warn(message, 'You must provide a word\n> Usage: `automod words remove <word>`');
                        const fetched = await fetchRule(message, 'words');
                        if (!fetched) return;
                        const filters = [...(fetched.rule.triggerMetadata.keywordFilter || [])];
                        if (!filters.includes(`*${word}*`)) return warn(message, `Word \`${word}\` is not blacklisted.`);
                        try {
                            await fetched.rule.edit({ triggerMetadata: { keywordFilter: filters.filter(entry => entry !== `*${word}*`) }, reason: `Words filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, `Word \`${word}\` has been removed from blacklist.`);
                    }
                },
                clear: {
                    aliases: [],
                    data: { name: 'automod words clear', description: "Clear all blacklisted words for words filter" },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const fetched = await fetchRule(message, 'words');
                        if (!fetched) return;
                        const filters = fetched.rule.triggerMetadata.keywordFilter || [];
                        if (!filters.length) return warn(message, 'No blacklisted words found.');
                        try {
                            await fetched.rule.edit({ triggerMetadata: { keywordFilter: [] }, reason: `Words filter rule edited by ${message.author}` });
                        } catch (err) {
                            return warn(message, 'Unable to edit automod rule, please resetup the automod.');
                        }
                        return approve(message, 'All blacklisted words have been cleared.');
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'automod words list', description: "List blacklisted words for words filter" },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const fetched = await fetchRule(message, 'words');
                        if (!fetched) return;
                        const filters = fetched.rule.triggerMetadata.keywordFilter || [];
                        if (!filters.length) return warn(message, 'No blacklisted words found.');
                        return paginate(message, [...filters], `${message.guild.name}'s Blacklisted Words`, {
                            name: message.guild.name,
                            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                        });
                    }
                }
            })
        },
        spam: {
            aliases: [],
            data: { name: 'automod spam', description: 'Prevent members from spamming messages' },
            subcommands: ['enable', 'disable', 'rate', 'timeout', 'message', 'ignore'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.spam, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: spamRepeatSubs('spam')
        },
        repeat: {
            aliases: [],
            data: { name: 'automod repeat', description: 'Prevent members from repeating messages' },
            subcommands: ['enable', 'disable', 'rate', 'timeout', 'message', 'ignore'],
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.repeat, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: spamRepeatSubs('repeat')
        }
    }
};

applyDescriptions(module.exports, {
    "automod invites timeout": "Change timeout duration for members who send invite links",
    "automod invites message": "Set a custom message for invites filter",
    "automod invites logs": "Set the channel where logs will be sent for invites filter",
    "automod invites ignore": "Manage ignored channels and roles for invites filter",
    "automod invites ignore add": "Add a user, role or channel to the antispam whitelist",
    "automod invites ignore remove": "Remove ignored users, channels and roles for invites filter",
    "automod invites ignore list": "List ignored users, channels and roles for invites filter",
    "automod words timeout": "Change timeout duration for members who spam messages",
    "automod words message": "Set a custom message for words filter",
    "automod words logs": "Set the channel where logs will be sent for words filter",
    "automod words ignore": "Manage ignored channels and roles for words filter",
    "automod words ignore add": "Add a user, role or channel to the antispam whitelist",
    "automod words ignore remove": "Remove ignored users, channels and roles for antispam",
    "automod words ignore list": "List ignored users, channels and roles for words filter",
    "automod spam rate": "Change rate at which members can sending messages in 10 seconds before triggering anti-spam protection",
    "automod spam timeout": "Change timeout duration for members who spam messages",
    "automod spam ignore remove": "Remove ignored users, channels and roles for antispam",
    "automod repeat rate": "Change rate at which members can sending messages in 10 seconds before triggering anti-repeat protection",
    "automod repeat timeout": "Change timeout duration for members who repeat messages",
    "automod repeat message": "Enable or disable the antirepeat punishment message",
    "automod repeat ignore list": "List all ignored users, channels and roles for antirepeat"
});
