const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');
const { dangerousRole, findRole, humanizeRole } = require('../../utils/roleGuard');

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

function parseRoles(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function resolveVoiceChannel(message, text) {
    const mention = message.mentions.channels.first();
    if (mention && mention.isVoiceBased && mention.isVoiceBased()) return mention;
    const id = String(text || '').replace(/[<#>]/g, '');
    const channel = message.guild.channels.cache.get(id);
    if (channel && channel.isVoiceBased && channel.isVoiceBased()) return channel;
    return null;
}

module.exports = {
    permission: "manage guild",
    data: {
        name: 'voicerole',
        description: 'Set up voice channel role assign',
        usage: ',voicerole <add|remove|default|clear|list>'
    },
    subcommands: ['add', 'remove', 'default', 'clear', 'list'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'voicerole add', description: 'Adds a voice channel role assign', usage: ',voicerole add #voice in-game' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channelToken = args[0];
                const roleText = args.slice(1).join(' ');
                const channel = resolveVoiceChannel(message, channelToken);
                if (!channel) return warn(message, 'Voice channel not found');
                if (!roleText) return warn(message, 'Usage: `voicerole add #voice <role>`');

                const guard = await dangerousRole(message, roleText, config);
                if (guard.error) return warn(message, guard.error);
                const role = guard.role;

                const check = first('SELECT roles FROM voicerole WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (check) {
                    const roles = parseRoles(check.roles);
                    if (roles.map(String).includes(String(role.id))) {
                        return warn(message, `Role ${role} is already assigned to this voice channel`);
                    }
                    roles.push(Number(role.id));
                    run('UPDATE voicerole SET roles = ? WHERE guild_id = ? AND channel_id = ?', JSON.stringify(roles), message.guild.id, channel.id);
                } else {
                    run('INSERT INTO voicerole (guild_id, channel_id, roles) VALUES (?, ?, ?)', message.guild.id, channel.id, JSON.stringify([Number(role.id)]));
                }
                return approve(message, `Added role ${role} for voice channel ${channel}`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'voicerole remove', description: 'Removes a voice channel role assign', usage: ',voicerole remove #voice <role>' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channelToken = args[0];
                const roleText = args.slice(1).join(' ');
                const channel = resolveVoiceChannel(message, channelToken);
                if (!channel) return warn(message, 'Voice channel not found');
                if (!roleText) return warn(message, 'Usage: `voicerole remove #voice <role>`');

                const role = findRole(message, roleText);
                const roleId = Number(role ? role.id : roleText.replace(/[<@&>]/g, ''));
                const check = first('SELECT roles FROM voicerole WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (!check) return warn(message, 'This voice channel is not configured for role assign');

                const roles = parseRoles(check.roles);
                if (!roles.map(Number).includes(roleId)) {
                    return warn(message, `Role ${humanizeRole(message.guild, roleId)} is not assigned to this voice channel`);
                }
                const next = roles.map(Number).filter(id => id !== roleId);
                if (next.length) {
                    run('UPDATE voicerole SET roles = ? WHERE guild_id = ? AND channel_id = ?', JSON.stringify(next), message.guild.id, channel.id);
                } else {
                    run('DELETE FROM voicerole WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                }
                return approve(message, `Removed role ${humanizeRole(message.guild, roleId)} from voice channel ${channel}`);
            }
        },

        default: {
            aliases: [],
            data: { name: 'voicerole default', description: 'Set up default role for voice channel role assign', usage: ',voicerole default <add|remove>' },
            subcommands: ['add', 'remove'],
            async execute(message) {
                return sendCard(message, module.exports.subs.default);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'voicerole default add', description: 'Sets a default role for voice channel role assign', usage: ',voicerole default add <role>' },
                    async execute(message, args, client, config) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const roleText = args.join(' ').trim();
                        if (!roleText) return warn(message, 'Usage: `voicerole default add <role>`');
                        const guard = await dangerousRole(message, roleText, config);
                        if (guard.error) return warn(message, guard.error);
                        const check = first('SELECT role_id FROM voicerole_default WHERE guild_id = ?', message.guild.id);
                        if (check) {
                            run('UPDATE voicerole_default SET role_id = ? WHERE guild_id = ?', guard.role.id, message.guild.id);
                        } else {
                            run('INSERT INTO voicerole_default (guild_id, role_id) VALUES (?, ?)', message.guild.id, guard.role.id);
                        }
                        return approve(message, `Set ${guard.role} as default role for voice channel role assign`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'voicerole default remove', description: 'Removes the default role for voice channel role assign', usage: ',voicerole default remove' },
                    async execute(message) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const check = first('SELECT role_id FROM voicerole_default WHERE guild_id = ?', message.guild.id);
                        if (!check) return warn(message, 'No default role set for voice channel role assign');
                        run('DELETE FROM voicerole_default WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'Removed default role for voice channel role assign');
                    }
                }
            }
        },

        clear: {
            aliases: [],
            data: { name: 'voicerole clear', description: 'Clears every voice channel role assign in guild', usage: ',voicerole clear' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to clear the voice channel role assign?`,
                    async i => {
                        run('DELETE FROM voicerole WHERE guild_id = ?', message.guild.id);
                        return i.update({
                            embeds: [successEmbed(null, `${i.user}: Cleared all voice channel role assign`)],
                            components: []
                        }).catch(() => {});
                    },
                    async i => {
                        return i.update({
                            embeds: [errorEmbed(null, `${i.user}: Voice channel role assign deletion got canceled`)],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        list: {
            aliases: [],
            data: { name: 'voicerole list', description: 'Lists all voice channels and their assigned roles', usage: ',voicerole list' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const records = query('SELECT channel_id, roles FROM voicerole WHERE guild_id = ?', message.guild.id);
                if (!records.length) return warn(message, 'No voice channels have assigned roles.');
                const lines = [];
                for (const record of records) {
                    const channel = message.guild.channels.cache.get(record.channel_id);
                    if (!channel) continue;
                    const roleIds = parseRoles(record.roles);
                    const roles = roleIds.map(id => message.guild.roles.cache.get(String(id))).filter(Boolean);
                    const rolesText = roles.length ? roles.map(role => `${role}`).join(' ') : 'No roles assigned or roles are unknown.';
                    lines.push(`**${channel}**: ${rolesText}`);
                }
                if (!lines.length) return warn(message, 'No valid voice channels found with assigned roles.');
                return paginate(message, lines, 'Voice Channel Roles', guildAuthor(message));
            }
        }
    }
};
