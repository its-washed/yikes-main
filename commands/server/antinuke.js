const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm, noStaff } = require('../../utils/moderation');
const { needAntinukeConfigured, needAntinukeOwner, needAntinukeAdmin } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

const PUNISHMENTS = ['ban', 'kick', 'strip', 'none'];

function parseList(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch (err) {
        return [];
    }
}

function findRole(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.roles.cache.get(id) || null;
    return message.guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase()) || null;
}

function findMember(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.members.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return message.guild.members.cache.find(m => m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase()) || null;
}

function findChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return null;
}

function resolveTarget(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const role = message.mentions.roles.first();
    if (role) return { type: 'role', value: role };
    const user = message.mentions.users.first() || (message.mentions.members.first() && message.mentions.members.first().user);
    if (user) return { type: 'user', value: user };
    const id = raw.replace(/[<@!&>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byRole = message.guild.roles.cache.get(id);
        if (byRole) return { type: 'role', value: byRole };
        const member = message.guild.members.cache.get(id);
        if (member) return { type: 'user', value: member.user };
        const byUser = message.client.users.cache.get(id);
        if (byUser) return { type: 'user', value: byUser };
    }
    return null;
}

async function needAdminPerms(message, config) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return false;
    if (!await needAntinukeConfigured(message, config)) return false;
    if (!await needAntinukeAdmin(message, config)) return false;
    return true;
}

function validatePunishment(message, value) {
    const punishment = String(value || '').toLowerCase();
    if (!PUNISHMENTS.includes(punishment)) {
        warn(message, `**${value || ''}** is **not** a valid punishment\n> Valid punishments: \`ban\`, \`kick\`, \`strip\` & \`none\``);
        return null;
    }
    return punishment;
}

const MODULE_PHRASES = {
    channeldelete: 'deleting channels',
    channelcreate: 'creating channels',
    roledelete: 'deleting roles',
    rolecreate: 'creating roles',
    giverole: 'giving dangerous roles',
    editrole: 'editing dangerous attributes of a role',
    kick: 'kicking members',
    ban: 'banning members',
    botadd: 'new bot additions',
    vanity: 'vanity change'
};
const MODULE_VERBS = { vanity: 'protaction' };


function thresholdModule(groupKey, moduleName, usage) {
    const pretty = moduleName.replace(/\b\w/g, c => c.toUpperCase());
    const phrase = MODULE_PHRASES[groupKey] || moduleName;
    const verb = MODULE_VERBS[groupKey] || 'protection';
    return {
        enable: {
            aliases: [],
            data: { name: `antinuke ${groupKey} enable`, description: `Enable ${verb} against ${phrase}`, usage },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const threshold = parseInt(args[0], 10);
                if (!Number.isFinite(threshold)) return warn(message, 'You must provide a threshold\n> Usage: `' + usage + '`');
                if (threshold < 0) return warn(message, "Threshold can't be lower than **0**");
                const punishment = validatePunishment(message, args[1]);
                if (!punishment) return;
                const check = first('SELECT 1 AS ok FROM antinuke_modules WHERE module = ? AND guild_id = ?', moduleName, message.guild.id);
                if (!check) {
                    run('INSERT INTO antinuke_modules (guild_id, module, punishment, threshold) VALUES (?, ?, ?, ?)',
                        message.guild.id, moduleName, punishment, threshold);
                } else {
                    run('UPDATE antinuke_modules SET punishment = ?, threshold = ? WHERE module = ? AND guild_id = ?',
                        punishment, threshold, moduleName, message.guild.id);
                }
                return approve(message, `Enabled **${moduleName}** protection\n> Punishment: **${punishment}** Threshold: **${threshold}/60s**`);
            }
        },
        disable: {
            aliases: [],
            data: { name: `antinuke ${groupKey} disable`, description: `Disable protection against ${phrase}` },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const check = first('SELECT 1 AS ok FROM antinuke_modules WHERE module = ? AND guild_id = ?', moduleName, message.guild.id);
                if (!check) return warn(message, `${pretty} protection is **not** enabled`);
                run('DELETE FROM antinuke_modules WHERE guild_id = ? AND module = ?', message.guild.id, moduleName);
                return approve(message, `Disabled **${moduleName}** protection`);
            }
        }
    };
}


function punishmentModule(groupKey, moduleName, usage, suffix) {
    const pretty = moduleName.replace(/\b\w/g, c => c.toUpperCase());
    const phrase = MODULE_PHRASES[groupKey] || moduleName;
    const verb = MODULE_VERBS[groupKey] || 'protection';
    return {
        enable: {
            aliases: [],
            data: { name: `antinuke ${groupKey} enable`, description: `Enable ${verb} against ${phrase}`, usage },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const punishment = validatePunishment(message, args[0]);
                if (!punishment) return;
                const check = first('SELECT 1 AS ok FROM antinuke_modules WHERE module = ? AND guild_id = ?', moduleName, message.guild.id);
                if (!check) {
                    run('INSERT INTO antinuke_modules (guild_id, module, punishment, threshold) VALUES (?, ?, ?, NULL)',
                        message.guild.id, moduleName, punishment);
                } else {
                    run('UPDATE antinuke_modules SET punishment = ? WHERE guild_id = ? AND module = ?',
                        punishment, message.guild.id, moduleName);
                }
                return approve(message, `Enabled **${moduleName}** protection\n> Punishment: **${punishment}**${suffix || ''}`);
            }
        },
        disable: {
            aliases: [],
            data: { name: `antinuke ${groupKey} disable`, description: `Disable protection against ${phrase}` },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const check = first('SELECT 1 AS ok FROM antinuke_modules WHERE module = ? AND guild_id = ?', moduleName, message.guild.id);
                if (!check) return warn(message, `${pretty} protection is **not** enabled`);
                run('DELETE FROM antinuke_modules WHERE guild_id = ? AND module = ?', message.guild.id, moduleName);
                return approve(message, `Disabled **${moduleName}** protection`);
            }
        }
    };
}

function moduleGroup(groupName, description, subs) {
    return {
        aliases: [],
        data: { name: `antinuke ${groupName}`, description },
        subcommands: Object.keys(subs),
        async execute(message, args, client, config) {
            return sendCard(message, module.exports.subs[groupName], { sub: String(args[0] || '').toLowerCase() });
        },
        subs
    };
}

const rolelockSubs = {
    enable: {
        aliases: [],
        data: { name: 'antinuke rolelock enable', description: 'Enable all role locks on the server' },
        async execute(message, args, client, config) {
            if (!await needAdminPerms(message, config)) return;
            const check = first('SELECT 1 AS ok FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            if (!check) {
                run('INSERT INTO antinuke_roles (guild_id, roles, status) VALUES (?, ?, ?)', message.guild.id, '[]', 1);
            } else {
                run('UPDATE antinuke_roles SET status = ? WHERE guild_id = ?', 1, message.guild.id);
            }
            return approve(message, 'Role lock system has been **enabled**');
        }
    },
    disable: {
        aliases: [],
        data: { name: 'antinuke rolelock disable', description: 'Disable all role locks on the server' },
        async execute(message, args, client, config) {
            if (!await needAdminPerms(message, config)) return;
            const check = first('SELECT 1 AS ok FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            if (!check) {
                run('INSERT INTO antinuke_roles (guild_id, roles, status) VALUES (?, ?, ?)', message.guild.id, '[]', 0);
            } else {
                run('UPDATE antinuke_roles SET status = ? WHERE guild_id = ?', 0, message.guild.id);
            }
            return approve(message, 'Role lock system has been **disabled**');
        }
    },
    add: {
        aliases: [],
        data: { name: 'antinuke rolelock add', description: 'Add a role to the lock list', usage: 'antinuke rolelock add @role' },
        async execute(message, args, client, config) {
            if (!await needAdminPerms(message, config)) return;
            const status = first('SELECT status FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            if (!status || !status.status) {
                return warn(message, `Role lock system is not enabled. Use \`antinuke rolelock enable\` first`);
            }
            const role = findRole(message, args.join(' '));
            if (!role) return warn(message, `Role **${args.join(' ')}** couldn't be found`);
            const row = first('SELECT roles FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            const list = parseList(row ? row.roles : null);
            if (list.includes(Number(role.id))) return warn(message, `Role ${role} is **already** locked`);
            list.push(Number(role.id));
            run('UPDATE antinuke_roles SET roles = ? WHERE guild_id = ?', JSON.stringify(list), message.guild.id);
            return approve(message, `Role ${role} has been **locked**`);
        }
    },
    remove: {
        aliases: [],
        data: { name: 'antinuke rolelock remove', description: 'Remove a role from the lock list', usage: 'antinuke rolelock remove @role' },
        async execute(message, args, client, config) {
            if (!await needAdminPerms(message, config)) return;
            const role = findRole(message, args.join(' '));
            if (!role) return warn(message, `Role **${args.join(' ')}** couldn't be found`);
            const status = first('SELECT status FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            if (!status || !status.status) {
                return warn(message, `Role lock system is not enabled. Use \`antinuke rolelock enable\` first`);
            }
            const row = first('SELECT roles FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            const list = parseList(row ? row.roles : null);
            if (!list.includes(Number(role.id))) return warn(message, `Role ${role} is **not** locked.`);
            run('UPDATE antinuke_roles SET roles = ? WHERE guild_id = ?', JSON.stringify(list.filter(id => id !== Number(role.id))), message.guild.id);
            return approve(message, `Role ${role} has been **unlocked**`);
        }
    },
    list: {
        aliases: [],
        data: { name: 'antinuke rolelock list', description: 'List all locked roles' },
        async execute(message, args, client, config) {
            if (!await needAdminPerms(message, config)) return;
            const row = first('SELECT roles FROM antinuke_roles WHERE guild_id = ?', message.guild.id);
            const list = parseList(row ? row.roles : null);
            const roles = list.map(id => message.guild.roles.cache.get(String(id))).filter(Boolean);
            if (!roles.length) return warn(message, 'There are **no** locked roles');
            return paginate(message, roles.map(role => `${role}`), `${message.guild.name}'s locked roles`, {
                name: message.guild.name,
                icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
            });
        }
    }
};

async function whitelistCommand(message, args, config, add) {
    if (!await needAdminPerms(message, config)) return;
    const target = resolveTarget(message, args.join(' '));
    if (!target) return warn(message, 'You must provide a user or a role');
    const row = first('SELECT whitelisted, whitelisted_roles FROM antinuke WHERE guild_id = ?', message.guild.id);
    const users = parseList(row ? row.whitelisted : null);
    const roles = parseList(row ? row.whitelisted_roles : null);

    if (target.type === 'role') {
        const id = Number(target.value.id);
        if (add) {
            if (roles.includes(id)) return warn(message, 'This role is **already** antinuke whitelisted');
            roles.push(id);
            run('UPDATE antinuke SET whitelisted_roles = ? WHERE guild_id = ?', JSON.stringify(roles), message.guild.id);
            return approve(message, `Whitelisted ${target.value} from Antinuke system`);
        }
        if (!roles.includes(id)) return warn(message, "This role isn't antinuke whitelisted");
        run('UPDATE antinuke SET whitelisted_roles = ? WHERE guild_id = ?', JSON.stringify(roles.filter(entry => entry !== id)), message.guild.id);
        return approve(message, `Unwhitelisted ${target.value} from Antinuke system`);
    }

    const id = Number(target.value.id);
    if (add) {
        if (users.includes(id)) return warn(message, 'This member is **already** antinuke whitelisted');
        users.push(id);
        run('UPDATE antinuke SET whitelisted = ? WHERE guild_id = ?', JSON.stringify(users), message.guild.id);
        return approve(message, `Whitelisted <@${id}> from Antinuke system`);
    }
    if (!users.includes(id)) return warn(message, "This member isn't antinuke whitelisted");
    run('UPDATE antinuke SET whitelisted = ? WHERE guild_id = ?', JSON.stringify(users.filter(entry => entry !== id)), message.guild.id);
    return approve(message, `Unwhitelisted <@${id}> from Antinuke system`);
}

module.exports = {
    data: { name: 'antinuke', description: 'Antinuke & antiraid commands', usage: ',antinuke <setup|reset|config|logs|...>' },
    aliases: ['an'],
    cooldown: 5,
    subcommands: ['setup', 'reset', 'config', 'logs', 'channeldelete', 'channelcreate', 'giverole', 'roledelete', 'rolecreate', 'rolelock', 'kick', 'ban', 'editrole', 'vanity', 'botadd', 'whitelist', 'unwhitelist', 'whitelisted', 'admin', 'staff', 'restore'],
    subUsages: {
        setup: ',antinuke setup',
        reset: ',antinuke reset',
        config: ',antinuke config',
        logs: ',antinuke logs [#channel]',
        channeldelete: ',antinuke channeldelete enable <threshold> <punishment>',
        channelcreate: ',antinuke channelcreate enable <threshold> <punishment>',
        giverole: ',antinuke giverole enable <punishment>',
        roledelete: ',antinuke roledelete enable <threshold> <punishment>',
        rolecreate: ',antinuke rolecreate enable <threshold> <punishment>',
        rolelock: ',antinuke rolelock <enable|disable|add|remove|list>',
        kick: ',antinuke kick enable <threshold> <punishment>',
        ban: ',antinuke ban enable <threshold> <punishment>',
        editrole: ',antinuke editrole enable <punishment>',
        vanity: ',antinuke vanity enable <punishment>',
        botadd: ',antinuke botadd enable <punishment>',
        whitelist: ',antinuke whitelist <user|role>',
        unwhitelist: ',antinuke unwhitelist <user|role>',
        whitelisted: ',antinuke whitelisted',
        admin: ',antinuke admin <add|remove|list>',
        staff: ',antinuke staff <add|remove|list>',
        restore: ',antinuke restore <member>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        setup: {
            aliases: [],
            data: { name: 'antinuke setup', description: 'Enable Antinuke system to protect your server' },
            async execute(message, args, client, config) {
                const check = first('SELECT * FROM antinuke WHERE guild_id = ?', message.guild.id);
                if (check && String(check.configured) === 'true') {
                    return warn(message, "Antinuke is **already** configured\n> You can check [**here**](https://docs.evelina.bot/security/antinuke#antinuke-recommended-configuration) our recommend antinuke configuration");
                }
                const ownerId = (check && check.owner_id) || message.guild.ownerId;
                if (String(message.author.id) !== String(ownerId)) {
                    return warn(message, `Only <@${ownerId}> can use this command!\n> If the account can't be used, please join the [**support server**](https://discord.gg/evelina)`);
                }
                if (!check) {
                    run('INSERT INTO antinuke (guild_id, configured, owner_id) VALUES (?, ?, ?)', message.guild.id, 'true', message.guild.ownerId);
                } else {
                    run('UPDATE antinuke SET configured = ? WHERE guild_id = ?', 'true', message.guild.id);
                }
                return approve(message, "Antinuke is **enabled**\n> You can check [**here**](https://docs.evelina.bot/security/antinuke#antinuke-recommended-configuration) our recommend antinuke configuration");
            }
        },

        reset: {
            aliases: ['disable'],
            data: { name: 'antinuke reset', description: 'Disable Antinuke system on your server' },
            async execute(message, args, client, config) {
                if (!await needAntinukeOwner(message, config)) return;
                await confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **disable** antinuke?`,
                    async (interaction) => {
                        run('DELETE FROM antinuke WHERE guild_id = ?', message.guild.id);
                        run('DELETE FROM antinuke_modules WHERE guild_id = ?', message.guild.id);
                        return interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Disabled the antinuke` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        return interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: Antinuke deactivation got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        config: {
            aliases: [],
            data: { name: 'antinuke config', description: 'View Antinuke config on your server' },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const rows = query('SELECT module, punishment, threshold FROM antinuke_modules WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is **no** module enabled');
                const embed = {
                    color: COLORS.NEUTRAL,
                    author: {
                        name: `${message.guild.name}'s Antinuke Config`,
                        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                    },
                    fields: rows.map(row => ({
                        name: `> ${String(row.module).charAt(0).toUpperCase() + String(row.module).slice(1)}`,
                        value: `Punishment: ${row.punishment}\nThreshold: ${row.threshold !== null && row.threshold !== undefined ? row.threshold : 'N/A'}`,
                        inline: true
                    }))
                };
                return message.reply({ embeds: [embed] });
            }
        },

        logs: {
            aliases: [],
            data: { name: 'antinuke logs', description: 'Add/Remove Antinuke logs channel', usage: 'antinuke logs #an-logs' },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const channel = findChannel(message, args.join(' '));
                if (!channel) {
                    run('UPDATE antinuke SET logs = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed the logs channel');
                }
                run('UPDATE antinuke SET logs = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Set the antinuke logs channel to ${channel}`);
            }
        },

        channeldelete: moduleGroup('channeldelete', 'Prevent admins from deleting channels',
            thresholdModule('channeldelete', 'channel delete', 'antinuke channeldelete enable 1 strip')),

        channelcreate: moduleGroup('channelcreate', 'Prevent admins from creating channels',
            thresholdModule('channelcreate', 'channel create', 'antinuke channelcreate enable 3 strip')),

        giverole: moduleGroup('giverole', 'Prevent admins from giving dangerous roles',
            punishmentModule('giverole', 'role giving', 'antinuke giverole enable ban')),

        roledelete: moduleGroup('roledelete', 'Prevent admins from deleting roles',
            thresholdModule('roledelete', 'role delete', 'antinuke roledelete enable 1 strip')),

        rolecreate: moduleGroup('rolecreate', 'Prevent admins from creating roles',
            thresholdModule('rolecreate', 'role create', 'antinuke rolecreate enable 3 strip')),

        rolelock: moduleGroup('rolelock', 'Manage role locks on your server', rolelockSubs),

        kick: moduleGroup('kick', 'Prevent admins from kicking members',
            thresholdModule('kick', 'kick', 'antinuke kick enable 3 kick')),

        ban: moduleGroup('ban', 'Prevent admins from banning members',
            thresholdModule('ban', 'ban', 'antinuke ban enable 3 kick')),

        editrole: moduleGroup('editrole', 'Prevent admins from editing dangerous roles',
            punishmentModule('editrole', 'edit role', 'antinuke editrole enable strip')),

        vanity: moduleGroup('vanity', 'Protect your server against vanity changes',
            punishmentModule('vanity', 'vanity change', 'antinuke vanity enable ban',
                '\n-# Keep in mind that the bot only will punish the user, not changing the Vanity back.')),

        botadd: moduleGroup('botadd', 'Protect your server against new bot additions',
            punishmentModule('botadd', 'bot add', 'antinuke botadd enable ban')),

        whitelist: {
            aliases: ['wl'],
            data: { name: 'antinuke whitelist', description: 'Whitelist a user or role from Antinuke system', usage: 'antinuke whitelist <user|role>' },
            async execute(message, args, client, config) {
                return whitelistCommand(message, args, config, true);
            }
        },

        unwhitelist: {
            aliases: ['uwl'],
            data: { name: 'antinuke unwhitelist', description: 'Unwhitelist a user or role from Antinuke system', usage: 'antinuke unwhitelist <user|role>' },
            async execute(message, args, client, config) {
                return whitelistCommand(message, args, config, false);
            }
        },

        whitelisted: {
            aliases: [],
            data: { name: 'antinuke whitelisted', description: 'View AntiNuke whitelisted members & bots on your server' },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const row = first('SELECT whitelisted, whitelisted_roles FROM antinuke WHERE guild_id = ?', message.guild.id);
                const users = parseList(row ? row.whitelisted : null);
                const roles = parseList(row ? row.whitelisted_roles : null);
                const content = [
                    ...users.map(id => `<@${id}>`),
                    ...roles.map(id => `<@&${id}>`)
                ];
                if (!content.length) return warn(message, 'There are **no** whitelisted members or roles');
                return paginate(message, content, `${message.guild.name}'s Antinuke whitelisted members & roles`, {
                    name: message.guild.name,
                    icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                });
            }
        },

        admin: {
            aliases: [],
            data: { name: 'antinuke admin', description: 'Manage the members that can change the Antinuke settings' },
            subcommands: ['add', 'remove', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.admin, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'antinuke admin add', description: 'Give a user permissions to edit Antinuke settings', usage: 'antinuke admin add <member>' },
                    async execute(message, args, client, config) {
                        if (!await needAntinukeConfigured(message, config)) return;
                        if (!await needAntinukeOwner(message, config)) return;
                        const member = findMember(message, args.join(' '));
                        if (!member) return warn(message, `Member **${args.join(' ')}** couldn't be found`);
                        if (member.id === message.author.id) return message.reply({ content: 'You are the antinuke owner yourself lol' });
                        if (member.user.bot) return message.reply({ content: "Why would a bot be an antinuke admin? They can't manage the settings anyways -_-" });
                        const row = first('SELECT admins FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const admins = parseList(row ? row.admins : null);
                        if (admins.includes(Number(member.id))) return warn(message, 'This member is **already** an antinuke admin');
                        admins.push(Number(member.id));
                        run('UPDATE antinuke SET admins = ? WHERE guild_id = ?', JSON.stringify(admins), message.guild.id);
                        return approve(message, `Added ${member} as an antinuke admin`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'antinuke admin remove', description: 'Remove a user permissions to edit Antinuke settings', usage: 'antinuke admin remove <member>' },
                    async execute(message, args, client, config) {
                        if (!await needAntinukeConfigured(message, config)) return;
                        if (!await needAntinukeOwner(message, config)) return;
                        const member = findMember(message, args.join(' '));
                        if (!member) return warn(message, `Member **${args.join(' ')}** couldn't be found`);
                        const row = first('SELECT admins FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const admins = parseList(row ? row.admins : null);
                        if (!admins.length) return warn(message, 'There is **no** antinuke admin');
                        if (!admins.includes(Number(member.id))) return warn(message, "This member isn't an antinuke admin");
                        run('UPDATE antinuke SET admins = ? WHERE guild_id = ?', JSON.stringify(admins.filter(id => id !== Number(member.id))), message.guild.id);
                        return approve(message, `Removed ${member} from the antinuke admins`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'antinuke admin list', description: 'View Antinuke admins on your server' },
                    async execute(message, args, client, config) {
                        if (!await needAdminPerms(message, config)) return;
                        const row = first('SELECT owner_id, admins FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const content = [`<@${row.owner_id}> 👑`];
                        content.push(...parseList(row.admins).map(id => `<@${id}>`));
                        return paginate(message, content, 'Antinuke admins', {
                            name: message.guild.name,
                            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                        });
                    }
                }
            }
        },

        staff: {
            aliases: [],
            data: { name: 'antinuke staff', description: 'Manage the roles that are marked as staff' },
            subcommands: ['add', 'remove', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.staff, { sub: String(args[0] || '').toLowerCase() });
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'antinuke staff add', description: 'Add a role as staff role', usage: 'antinuke staff add <role>' },
                    async execute(message, args, client, config) {
                        if (!await needAntinukeConfigured(message, config)) return;
                        if (!await needAntinukeOwner(message, config)) return;
                        const role = findRole(message, args.join(' '));
                        if (!role) return warn(message, `Role **${args.join(' ')}** couldn't be found`);
                        if (role.managed) return message.reply({ content: 'Managed roles cannot be set as staff role' });
                        const row = first('SELECT staffs FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const staffs = parseList(row ? row.staffs : null);
                        if (staffs.includes(Number(role.id))) return warn(message, 'This role is **already** set as staff role');
                        staffs.push(Number(role.id));
                        run('UPDATE antinuke SET staffs = ? WHERE guild_id = ?', JSON.stringify(staffs), message.guild.id);
                        return approve(message, `Added ${role} as staff role`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'antinuke staff remove', description: 'Remove a role as staff role', usage: 'antinuke staff remove <role>' },
                    async execute(message, args, client, config) {
                        if (!await needAntinukeConfigured(message, config)) return;
                        if (!await needAntinukeOwner(message, config)) return;
                        const role = findRole(message, args.join(' '));
                        if (!role) return warn(message, `Role **${args.join(' ')}** couldn't be found`);
                        const row = first('SELECT staffs FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const staffs = parseList(row ? row.staffs : null);
                        if (!staffs.length) return warn(message, 'There are **no** staff role');
                        if (!staffs.includes(Number(role.id))) return warn(message, "This role isn't set as staff role");
                        run('UPDATE antinuke SET staffs = ? WHERE guild_id = ?', JSON.stringify(staffs.filter(id => id !== Number(role.id))), message.guild.id);
                        return approve(message, `Removed ${role} as staff role`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'antinuke staff list', description: 'View all staff roles' },
                    async execute(message, args, client, config) {
                        if (!await needAdminPerms(message, config)) return;
                        const row = first('SELECT staffs FROM antinuke WHERE guild_id = ?', message.guild.id);
                        const staffs = parseList(row ? row.staffs : null);
                        if (!staffs.length) return warn(message, 'There are **no** staff roles');
                        return paginate(message, staffs.map(id => `<@&${id}>`), 'Antinuke Staff roles', {
                            name: message.guild.name,
                            icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                        });
                    }
                }
            }
        },

        restore: {
            aliases: [],
            data: { name: 'antinuke restore', description: 'Restore roles after an antinuke punishment', usage: 'antinuke restore <member>' },
            async execute(message, args, client, config) {
                if (!await needAdminPerms(message, config)) return;
                const member = await noStaff(message, args[0], 'restore');
                if (!member) return;

                const check = first('SELECT roles FROM restore_antinuke WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                if (!check) return warn(message, "This member doesn't have any roles saved.");

                const saved = parseList(check.roles);
                const me = message.guild.members.me;
                const assignable = saved
                    .map(id => message.guild.roles.cache.get(String(id)))
                    .filter(role => role && !role.managed && role.id !== message.guild.id)
                    .filter(role => role.position < message.member.roles.highest.position)
                    .filter(role => me && role.position < me.roles.highest.position);
                if (!assignable.length) {
                    return warn(message, 'No assignable roles were found to restore. Make sure your role hierarchy allows this.');
                }

                const restored = [];
                for (const role of assignable) {
                    try {
                        await member.roles.add(role, `Dangerous roles restored by ${message.author}`);
                        restored.push(`${role}`);
                    } catch (err) {
                        return warn(message, `I don't have permission to assign the role: ${role}`);
                    }
                }
                run('DELETE FROM restore_antinuke WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                if (restored.length) {
                    return approve(message, `Successfully restored the following roles for ${member}: ${restored.join(', ')}.`);
                }
                return warn(message, 'No roles were restored due to permission issues or hierarchy conflicts');
            }
        }
    }
};
