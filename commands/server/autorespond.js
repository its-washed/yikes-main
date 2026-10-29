const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

function parseData(value) {
    try {
        const parsed = JSON.parse(value || null);
        if (parsed && typeof parsed === 'object') {
            return {
                users: Array.isArray(parsed.users) ? parsed.users : [],
                channels: Array.isArray(parsed.channels) ? parsed.channels : [],
                roles: Array.isArray(parsed.roles) ? parsed.roles : []
            };
        }
    } catch (err) {}
    return { users: [], channels: [], roles: [] };
}

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

function resolveTarget(message, text) {
    const mention = /^(?:<@!?(\d+)>|<@&(\d+)>|<#(\d+)>)$/.exec(text.trim());
    if (mention) {
        if (mention[1]) return { type: 'user', id: mention[1], mention: `<@${mention[1]}>` };
        if (mention[2]) return { type: 'role', id: mention[2], mention: `<@&${mention[2]}>` };
        return { type: 'channel', id: mention[3], mention: `<#${mention[3]}>` };
    }
    const id = /^\d+$/.test(text.trim()) ? text.trim() : null;
    if (!id) return null;
    if (message.guild.members.cache.has(id)) return { type: 'user', id, mention: `<@${id}>` };
    if (message.guild.roles.cache.has(id)) return { type: 'role', id, mention: `<@&${id}>` };
    if (message.guild.channels.cache.has(id)) return { type: 'channel', id, mention: `<#${id}>` };
    return null;
}

function togglePermission(state, target) {
    const bucket = target.type === 'user' ? 'users' : target.type === 'role' ? 'roles' : 'channels';
    const existing = first('SELECT data FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ? AND state = ?', state.guildId, state.trigger, state.state);
    const data = parseData(existing && existing.data);
    let action;
    const idx = data[bucket].map(String).indexOf(String(target.id));
    if (idx !== -1) {
        data[bucket].splice(idx, 1);
        action = 'Removed';
    } else {
        data[bucket].push(String(target.id));
        action = 'Added';
    }
    if (!data.users.length && !data.roles.length && !data.channels.length) {
        run('DELETE FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ? AND state = ?', state.guildId, state.trigger, state.state);
    } else {
        run('DELETE FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ? AND state = ?', state.guildId, state.trigger, state.state);
        run('INSERT INTO autoresponder_permissions (guild_id, "trigger", state, data) VALUES (?, ?, ?, ?)', state.guildId, state.trigger, state.state, JSON.stringify(data));
    }
    return action;
}

async function editPermissions(message, args, state) {
    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
    const trigger = (args[0] || '').toLowerCase();
    if (!trigger) return warn(message, 'No trigger provided');
    const check = first('SELECT 1 AS ok FROM autoresponder WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
    if (!check) return warn(message, 'No autoresponder found with the given trigger');
    const target = resolveTarget(message, args.slice(1).join(' '));
    if (!target) return warn(message, 'No valid `user`, `role`, or `channel` found');
    const action = togglePermission({ guildId: message.guild.id, trigger, state }, target);
    return approve(message, `${action} ${target.type} ${target.mention} ${action === 'Added' ? 'to' : 'from'} **${state}** permissions for trigger **${trigger}**`);
}

module.exports = {
    data: {
        name: 'autoresponder',
        description: 'Set up automatic replies to messages that match a trigger',
        usage: ',autoresponder <add|remove|allow|deny|permissions|clear|list>'
    },
    aliases: ["ar"],
    subcommands: ['add', 'remove', 'allow', 'deny', 'permissions', 'clear', 'list'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'autoresponder add', description: 'Create a reply for a trigger word', usage: ',autoresponder add hello, hello world --not_strict' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                let content = args.join(' ');
                if (!content.trim()) return warn(message, 'Response not found! Please use `,` to split the trigger and the response');
                let strict = true;
                let deleteFlag = false;
                let replyFlag = false;
                if (content.includes(' --not_strict')) { strict = false; content = content.replace(' --not_strict', ''); }
                if (content.includes(' --delete')) { deleteFlag = true; content = content.replace(' --delete', ''); }
                if (content.includes(' --reply')) { replyFlag = true; content = content.replace(' --reply', ''); }

                const parts = content.split(/,\s*/);
                if (parts.length === 1) return warn(message, 'Response not found! Please use `,` to split the trigger and the response');
                const trigger = parts[0].trim();
                if (!trigger) return warn(message, 'No trigger found');
                const response = parts.slice(1).join(', ').trim();
                if (!response) return warn(message, 'Response not found! Please use `,` to split the trigger and the response');

                const check = first('SELECT 1 AS ok FROM autoresponder WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger.toLowerCase());
                if (check) return warn(message, `An autoresponder for **${trigger}** already exists`);
                run('INSERT INTO autoresponder (guild_id, "trigger", response, strict, "delete", reply) VALUES (?, ?, ?, ?, ?, ?)',
                    message.guild.id, trigger.toLowerCase(), response, strict, deleteFlag, replyFlag);
                return approve(message, `Added autoresponder for **${trigger}** - ${response}${!strict ? ' (not strict)' : ''}${deleteFlag ? ' (delete trigger)' : ''}${replyFlag ? ' (reply)' : ''}`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'autoresponder remove', description: 'Remove a reply for a trigger word', usage: ',autoresponder remove hello' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const trigger = (args.join(' ') || '').trim();
                if (!trigger) return warn(message, 'No trigger provided');
                const check = first('SELECT 1 AS ok FROM autoresponder WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
                if (!check) return warn(message, 'There is no autoresponder with the trigger you have provided');
                run('DELETE FROM autoresponder WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
                return approve(message, `Deleted the autoresponder for **${trigger}**`);
            }
        },

        allow: {
            aliases: [],
            data: { name: 'autoresponder allow', description: 'Set specific users, channels, or roles as allowed for a trigger', usage: ',autoresponder allow hello its_washed' },
            execute: async (message, args) => editPermissions(message, args, 'allow')
        },

        deny: {
            aliases: [],
            data: { name: 'autoresponder deny', description: 'Set specific users, channels, or roles as denied for a trigger', usage: ',autoresponder deny hello its_washed' },
            execute: async (message, args) => editPermissions(message, args, 'deny')
        },

        permissions: {
            aliases: [],
            data: { name: 'autoresponder permissions', description: 'Shows the allowed and denied users, roles, and channels for all autoresponder triggers', usage: ',autoresponder permissions' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const triggers = query('SELECT DISTINCT "trigger" FROM autoresponder WHERE guild_id = ?', message.guild.id);
                if (!triggers.length) return warn(message, 'No autoresponder triggers found for this guild.');

                const withPermissions = [];
                for (const row of triggers) {
                    const trigger = row.trigger;
                    const allowed = first('SELECT data FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ? AND state = ?', message.guild.id, trigger, 'allow');
                    const denied = first('SELECT data FROM autoresponder_permissions WHERE guild_id = ? AND "trigger" = ? AND state = ?', message.guild.id, trigger, 'deny');
                    const allowedData = parseData(allowed && allowed.data);
                    const deniedData = parseData(denied && denied.data);
                    if (allowedData.users.length || allowedData.roles.length || allowedData.channels.length ||
                        deniedData.users.length || deniedData.roles.length || deniedData.channels.length) {
                        withPermissions.push({ trigger, allowedData, deniedData });
                    }
                }
                if (!withPermissions.length) return warn(message, 'No autoresponder triggers have permissions set');

                const pages = [];
                for (let i = 0; i < withPermissions.length; i += 3) {
                    const chunk = withPermissions.slice(i, i + 3);
                    pages.push({
                        color: COLORS.NEUTRAL,
                        title: 'Autoresponder Permissions',
                        footer: { text: `Page: ${i / 3 + 1}/${Math.floor((withPermissions.length - 1) / 3) + 1} (${withPermissions.length} entries)` },
                        fields: chunk.map(entry => ({
                            name: entry.trigger,
                            inline: false,
                            value: [
                                `Allowed: ${[...entry.allowedData.users.map(id => `<@${id}>`), ...entry.allowedData.roles.map(id => `<@&${id}>`), ...entry.allowedData.channels.map(id => `<#${id}>`)].join(' ')}`,
                                `Denied: ${[...entry.deniedData.users.map(id => `<@${id}>`), ...entry.deniedData.roles.map(id => `<@&${id}>`), ...entry.deniedData.channels.map(id => `<#${id}>`)].join(' ')}`
                            ].join('\n')
                        }))
                    });
                }
                const { Paginator } = require('../../utils/pagination');
                const paginator = new Paginator(pages, { userId: message.author.id });
                const embeds = paginator.buildEmbeds();
                const components = pages.length > 1 ? [paginator.buildRow()] : [];
                const sent = await message.reply({ embeds, components });
                if (pages.length > 1) await paginator.start(message.channel, sent);
                return sent;
            }
        },

        clear: {
            aliases: [],
            data: { name: 'autoresponder clear', description: 'Remove all autoresponders', usage: ',autoresponder clear' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query('SELECT 1 AS ok FROM autoresponder WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'You have **no** autoresponders in this server');
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **CLEAR** all autoresponders in this server?`,
                    async i => {
                        run('DELETE FROM autoresponder WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Deleted all autoresponders in this server`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Autoresponders deletion got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },

        list: {
            aliases: [],
            data: { name: 'autoresponder list', description: 'View a list of auto-reply triggers in guild', usage: ',autoresponder list' },
            async execute(message) {
                const rows = query('SELECT * FROM autoresponder WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No **autoresponders** are set!');
                return paginate(message, rows.map(row => row.trigger), 'Autoresponders', guildAuthor(message));
            }
        }
    }
};
