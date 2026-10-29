const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

const presenceEvent = require('../../events/vanityPresence');

function boostGate(message) {
    if ((message.guild.premiumTier || 0) < 3) {
        warn(message, 'The server has to be boosted to level **3** to be able to use this command');
        return false;
    }
    return true;
}

function parseRoles(raw) {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function humanizeRole(guild, roleId) {
    const role = guild.roles.cache.get(String(roleId));
    return role ? `<@&${role.id}>` : `@${roleId}`;
}

module.exports = {
    data: { name: 'vanity', description: 'Manage vanity settings', usage: ',vanity <set|remove|role|message|channel|config>' },
    aliases: ['van'],
    cooldown: 5,
    subcommands: ['set', 'remove', 'role', 'message', 'channel', 'config'],
    subUsages: {
        set: ',vanity set /evelina',
        remove: ',vanity remove',
        role: ',vanity role <add|remove|list>',
        message: ',vanity message <text>',
        channel: ',vanity channel <set|remove>',
        config: ',vanity config'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        set: {
            aliases: [],
            data: { name: 'vanity set', description: 'Set the vanity substring', usage: ',vanity set /evelina' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!boostGate(message)) return;
                const vanity = args.join(' ').trim();
                if (!vanity) return warn(message, 'Usage: `vanity set /evelina`');
                const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                if (check) {
                    run('UPDATE vanity SET trigger = ? WHERE guild_id = ?', vanity, message.guild.id);
                    presenceEvent.reload();
                    return approve(message, `Updated **vanity substring** to \`${vanity}\``);
                }
                run('INSERT INTO vanity (guild_id, trigger) VALUES (?, ?)', message.guild.id, vanity);
                presenceEvent.reload();
                return approve(message, `Set **vanity substring** to \`${vanity}\``);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'vanity remove', description: 'Remove the vanity substring', usage: ',vanity remove' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!boostGate(message)) return;
                const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                if (check) {
                    run('DELETE FROM vanity WHERE guild_id = ?', message.guild.id);
                    presenceEvent.reload();
                    return approve(message, 'Removed **vanity substring**');
                }
                presenceEvent.reload();
                return warn(message, 'No **vanity substring** set');
            }
        },
        role: {
            aliases: [],
            data: { name: 'vanity role', description: 'Manage vanity reward roles', usage: ',vanity role <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            subUsages: {
                add: ',vanity role add @role',
                remove: ',vanity role remove @role',
                list: ',vanity role list'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.role);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'vanity role add', description: 'Add a role as vanity reward role', usage: ',vanity role add @role' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!boostGate(message)) return;
                        const role = message.mentions.roles.first();
                        if (!role) return warn(message, 'Usage: `vanity role add @role`');
                        const row = first('SELECT roles FROM vanity WHERE guild_id = ?', message.guild.id);
                        const roles = row ? parseRoles(row.roles) : [];
                        if (roles.includes(String(role.id))) return warn(message, 'This role is **already** set as vanity reward role');
                        roles.push(String(role.id));
                        if (row) run('UPDATE vanity SET roles = ? WHERE guild_id = ?', JSON.stringify(roles), message.guild.id);
                        else run('INSERT INTO vanity (guild_id, roles) VALUES (?, ?)', message.guild.id, JSON.stringify(roles));
                        presenceEvent.reload();
                        return approve(message, `Added ${role.toString()} as **vanity reward role**`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'vanity role remove', description: 'Remove a role from vanity reward roles', usage: ',vanity role remove @role' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!boostGate(message)) return;
                        const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args.join(' ')).replace(/[<@&>]/g, '').trim());
                        if (!role) return warn(message, 'Usage: `vanity role remove @role`');
                        const row = first('SELECT roles FROM vanity WHERE guild_id = ?', message.guild.id);
                        const roles = row ? parseRoles(row.roles) : [];
                        if (!roles.length) return warn(message, 'No **award roles** set');
                        if (!roles.includes(String(role.id))) return warn(message, `Role ${humanizeRole(message.guild, role.id)} is **not** an award role`);
                        const next = roles.filter(id => id !== String(role.id));
                        run('UPDATE vanity SET roles = ? WHERE guild_id = ?', JSON.stringify(next), message.guild.id);
                        presenceEvent.reload();
                        return approve(message, `Removed ${humanizeRole(message.guild, role.id)} as an **award role**`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'vanity role list', description: 'List all vanity reward roles', usage: ',vanity role list' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!boostGate(message)) return;
                        const row = first('SELECT roles FROM vanity WHERE guild_id = ?', message.guild.id);
                        const roles = row ? parseRoles(row.roles) : [];
                        if (!roles.length) return warn(message, 'No **award roles** set');
                        const lines = roles.map(id => humanizeRole(message.guild, id));
                        return paginate(message, lines, 'Vanity Award Roles',
                            { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
                    }
                }
            }
        },
        message: {
            aliases: [],
            data: { name: 'vanity message', description: 'Set the vanity message', usage: ',vanity message <text>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!boostGate(message)) return;
                const text = args.join(' ').trim();
                if (!text) return warn(message, 'Usage: `vanity message <text>`');
                const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                if (check) {
                    run('UPDATE vanity SET message = ? WHERE guild_id = ?', text, message.guild.id);
                    presenceEvent.reload();
                    return approve(message, `Updated **vanity message** to:\n\`\`\`${text}\`\`\``);
                }
                run('INSERT INTO vanity (guild_id, message) VALUES (?, ?)', message.guild.id, text);
                presenceEvent.reload();
                return approve(message, `Set **vanity message** to:\n\`\`\`${text}\`\`\``);
            }
        },
        channel: {
            aliases: [],
            data: { name: 'vanity channel', description: 'Manage vanity channel', usage: ',vanity channel <set|remove>' },
            subcommands: ['set', 'remove'],
            subUsages: {
                set: ',vanity channel set #channel',
                remove: ',vanity channel remove'
            },
            execute: async (message, args, client) => {
                return sendCard(message, module.exports.subs.channel);
            },
            subs: {
                set: {
                    aliases: [],
                    data: { name: 'vanity channel set', description: 'Set the vanity channel', usage: ',vanity channel set #channel' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!boostGate(message)) return;
                        const channel = message.mentions.channels.first();
                        if (!channel) return warn(message, 'Usage: `vanity channel set #channel`');
                        const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                        if (check) {
                            run('UPDATE vanity SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                            presenceEvent.reload();
                            return approve(message, `Set **vanity channel** to ${channel.toString()}`);
                        }
                        run('INSERT INTO vanity (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                        presenceEvent.reload();
                        return approve(message, `Set **vanity channel** to ${channel.toString()}`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'vanity channel remove', description: 'Remove the vanity channel', usage: ',vanity channel remove' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        if (!boostGate(message)) return;
                        const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                        if (check) {
                            run('UPDATE vanity SET channel_id = NULL WHERE guild_id = ?', message.guild.id);
                            presenceEvent.reload();
                            return approve(message, 'Removed **vanity channel**');
                        }
                        presenceEvent.reload();
                        return warn(message, 'No **vanity channel** set');
                    }
                }
            }
        },
        config: {
            aliases: [],
            data: { name: 'vanity config', description: 'Show the vanity settings for the guild.', usage: ',vanity config' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!boostGate(message)) return;
                const check = first('SELECT * FROM vanity WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'No **vanity settings** found for this server.');
                const trigger = check.trigger || EMOJIS.DENY;
                const text = check.message || 'No message set';
                const roleIds = parseRoles(check.roles);
                const roleMentions = roleIds.map(id => humanizeRole(message.guild, id));
                const roleValue = roleMentions.length ? roleMentions.join(', ') : EMOJIS.DENY;
                const channelValue = check.channel_id ? `<#${check.channel_id}>` : EMOJIS.DENY;
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: 'Vanity Settings',
                        fields: [
                            { name: 'Channel', value: channelValue, inline: true },
                            { name: 'Trigger', value: trigger, inline: true },
                            { name: 'Roles', value: roleValue, inline: true },
                            { name: 'Message', value: '```' + text + '```', inline: false }
                        ]
                    }]
                });
            }
        }
    }
};
