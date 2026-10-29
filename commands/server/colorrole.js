const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, prefix, confirm } = require('../../utils/moderation');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');

function configured(guildId) {
    return Boolean(first('SELECT 1 AS ok FROM color_module WHERE guild_id = ?', guildId));
}

async function needConfigured(message) {
    if (configured(message.guild.id)) return true;
    await warn(message, `Color role module is **not** configured\n> Use \`${prefix(message)}colorrole setup\` to enable it`);
    return false;
}

function parseHex(value) {
    let text = String(value || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(text)) text = text.split('').map(char => char + char).join('');
    if (!/^[0-9a-f]{6}$/i.test(text)) return null;
    return { value: parseInt(text, 16), hex: `#${text.toUpperCase()}` };
}

async function removeOldColorRoles(message) {
    let removed = false;
    for (const role of [...message.member.roles.cache.values()]) {
        if (/^#[0-9a-f]{6}$/i.test(role.name)) {
            await message.member.roles.remove(role, 'Color role change');
            if (role.members.size === 0) {
                await role.delete('Unused color role removed').catch(() => {});
                run('DELETE FROM color_roles WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
            }
            removed = true;
        }
    }
    return removed;
}

module.exports = {
    data: { name: 'colorrole', description: 'Colorrole commands', usage: ',colorrole <setup|reset|base|set|remove>' },
    aliases: ['cr'],
    cooldown: 5,
    subcommands: ['setup', 'reset', 'base', 'set', 'remove'],
    subUsages: {
        setup: ',colorrole setup',
        reset: ',colorrole reset',
        base: ',colorrole base [role]',
        set: ',colorrole set <hex>',
        remove: ',colorrole remove'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        setup: {
            aliases: [],
            data: { name: 'colorrole setup', description: 'Enable Colorrole system in your server', usage: ',colorrole setup' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (configured(message.guild.id)) return warn(message, 'Color role is **already** configured');
                run('INSERT INTO color_module (guild_id) VALUES (?)', message.guild.id);
                return approve(message, 'Configured color role module');
            }
        },
        reset: {
            aliases: [],
            data: { name: 'colorrole reset', description: 'Disable Colorrole system in your server', usage: ',colorrole reset' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needConfigured(message)) return;
                return confirm(message, `${message.author}: Are you sure you want to unset the colorrole module? This action is **IRREVERSIBLE**`,
                    async i => {
                        run('DELETE FROM color_module WHERE guild_id = ?', message.guild.id);
                        run('DELETE FROM color_roles WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Color role module cleared`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Color role deactivation got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        base: {
            aliases: [],
            data: { name: 'colorrole base', description: "Set the base role for where boost roles will go under", usage: ',colorrole base [role]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!await needConfigured(message)) return;
                const row = first('SELECT base FROM color_module WHERE guild_id = ?', message.guild.id);
                let role = null;
                if (args[0]) {
                    const id = String(args[0]).replace(/[<@&>]/g, '');
                    role = /^\d{17,20}$/.test(id) ? message.guild.roles.cache.get(id) : null;
                    if (!role) return warn(message, 'That role couldn\'t be found');
                }
                if (!role) {
                    if (!row || !row.base) return warn(message, 'Color role module **base role** isn\'t set');
                    run('UPDATE color_module SET base = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed base role');
                }
                run('UPDATE color_module SET base = ? WHERE guild_id = ?', role.id, message.guild.id);
                return approve(message, `Set ${role} as base role`);
            }
        },
        set: {
            aliases: [],
            data: { name: 'colorrole set', description: 'Set or change your color role', usage: ',colorrole set <hex>' },
            execute: async (message, args, client) => {
                if (!await needConfigured(message)) return;
                const parsed = parseHex(args[0]);
                if (!parsed) return warn(message, 'Please provide a valid hex color\n> Example: `colorrole set #ff0000`');
                const base = first('SELECT base FROM color_module WHERE guild_id = ?', message.guild.id);

                try {
                    await removeOldColorRoles(message);
                } catch (err) {
                    return warn(message, 'I don\'t have permission to remove roles');
                }

                const existing = first('SELECT role_id FROM color_roles WHERE guild_id = ? AND color = ?', message.guild.id, parsed.hex);
                if (existing) {
                    const role = message.guild.roles.cache.get(String(existing.role_id));
                    if (role) {
                        try {
                            await message.member.roles.add(role, `colorrole ${parsed.hex}`);
                            return approve(message, 'Color role assigned');
                        } catch (err) {
                            return warn(message, 'I don\'t have permission to assign roles');
                        }
                    }
                    run('DELETE FROM color_roles WHERE guild_id = ? AND role_id = ?', message.guild.id, existing.role_id);
                }

                if (message.guild.roles.cache.size >= 250) {
                    return warn(message, 'I can\'t create more roles, please delete some roles first');
                }
                try {
                    const role = await message.guild.roles.create({ name: parsed.hex, color: parsed.value, reason: 'colorrole' });
                    const position = base && base.base ? (message.guild.roles.cache.get(String(base.base)) || {}).position || 1 : 1;
                    await role.setPosition(position).catch(() => {});
                    await message.member.roles.add(role, `colorrole ${parsed.hex}`);
                    run('INSERT INTO color_roles (guild_id, role_id, color) VALUES (?, ?, ?)', message.guild.id, role.id, parsed.hex);
                    return approve(message, `Color role \`${parsed.hex}\` got created`);
                } catch (err) {
                    return warn(message, 'I don\'t have permission to create roles');
                }
            }
        },
        remove: {
            aliases: [],
            data: { name: 'colorrole remove', description: 'Remove your current color role', usage: ',colorrole remove' },
            execute: async (message, args, client) => {
                if (!await needConfigured(message)) return;
                let removed = false;
                try {
                    removed = await removeOldColorRoles(message);
                } catch (err) {
                    return warn(message, 'I don\'t have permission to remove roles');
                }
                if (removed) return approve(message, 'Color role got removed');
                return warn(message, 'You don\'t have a color role to remove');
            }
        }
    }
};
