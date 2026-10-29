const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { dangerousRole, findRole, humanizeRole } = require('../../utils/roleGuard');

const TYPES = {
    humans: { table: 'autorole_humans', label: 'humans', display: 'Autoroles for Humans', joinLabel: 'humans' },
    bots: { table: 'autorole_bots', label: 'bots', display: 'Autoroles for Bots', joinLabel: 'bots' },
    all: { table: 'autorole', label: 'all members', display: 'Autoroles for All Members', joinLabel: 'all members' }
};

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

function buildType(message, config, type) {
    const info = TYPES[type];
    return {
        aliases: [],
        data: {
            name: `autorole ${type}`,
            description: type === 'humans'
                ? 'Set up automatic role assign for humans'
                : type === 'bots'
                    ? 'Set up automatic role assign for bots'
                    : 'Set up automatic role assign for all members',
            usage: `,autorole ${type} <add|remove|list|clear>`
        },
        subcommands: ['add', 'remove', 'list', 'clear'],
        async execute(msg) {
            return sendCard(msg, module.exports.subs[type]);
        },
        subs: {
            add: {
                aliases: [],
                data: { name: `autorole ${type} add`, description: `Adds an autorole for ${info.label} and assigns on join`, usage: `,autorole ${type} add <role>` },
                async execute(message, args, client, config) {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const roleText = args.join(' ').trim();
                    if (!roleText) return warn(message, `Usage: \`autorole ${type} add <role>\``);
                    const guard = await dangerousRole(message, roleText, config);
                    if (guard.error) return warn(message, guard.error);
                    const existing = first(`SELECT 1 AS ok FROM ${info.table} WHERE guild_id = ? AND role_id = ?`, message.guild.id, guard.role.id);
                    if (existing) return warn(message, `This role is **already** an autorole for ${info.label}`);
                    run(`INSERT INTO ${info.table} (guild_id, role_id) VALUES (?, ?)`, message.guild.id, guard.role.id);
                    return approve(message, `${guard.role} added as autorole for ${info.label}`);
                }
            },
            remove: {
                aliases: [],
                data: { name: `autorole ${type} remove`, description: `Removes an autorole for ${info.label}`, usage: `,autorole ${type} remove <role>` },
                async execute(message, args) {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const roleText = args.join(' ').trim();
                    if (!roleText) return warn(message, `Usage: \`autorole ${type} remove <role>\``);
                    const role = findRole(message, roleText);
                    const roleId = role ? role.id : roleText.replace(/[<@&>]/g, '');
                    const check = first(`SELECT 1 AS ok FROM ${info.table} WHERE guild_id = ? AND role_id = ?`, message.guild.id, roleId);
                    if (!check) return warn(message, `This role is **not** configured as an autorole for ${info.label}`);
                    run(`DELETE FROM ${info.table} WHERE guild_id = ? AND role_id = ?`, message.guild.id, roleId);
                    return approve(message, `${humanizeRole(message.guild, roleId)} removed from autorole list for ${info.label}`);
                }
            },
            list: {
                aliases: [],
                data: { name: `autorole ${type} list`, description: `View a list of every auto role for ${info.label}`, usage: `,autorole ${type} list` },
                async execute(message) {
                    const rows = query(`SELECT * FROM ${info.table} WHERE guild_id = ?`, message.guild.id);
                    if (!rows.length) return warn(message, `No autoroles for ${info.label} found for this server`);
                    const lines = rows.map(row => humanizeRole(message.guild, row.role_id));
                    return paginate(message, lines, info.display, guildAuthor(message));
                }
            },
            clear: {
                aliases: [],
                data: { name: `autorole ${type} clear`, description: `Clears every autorole for ${info.label} in guild`, usage: `,autorole ${type} clear` },
                async execute(message) {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    return confirm(message,
                        `Are you sure you want to clear the autoroles for ${info.label}?`,
                        async i => {
                            run(`DELETE FROM ${info.table} WHERE guild_id = ?`, message.guild.id);
                            return i.update({
                                embeds: [successEmbed(null, `Cleared all autoroles for ${info.label}`)],
                                components: []
                            }).catch(() => {});
                        },
                        async i => {
                            return i.update({
                                embeds: [errorEmbed(null, `Autorole deletion for ${info.label} got canceled`)],
                                components: []
                            }).catch(() => {});
                        });
                }
            }
        }
    };
}

const root = {
    data: {
        name: 'autorole',
        description: 'Set up automatic role assign on member join',
        usage: ',autorole <humans|bots|all>'
    },
    aliases: [],
    subcommands: ['humans', 'bots', 'all'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    }
};

module.exports = root;
root.subs = {
    humans: buildType(null, null, 'humans'),
    bots: buildType(null, null, 'bots'),
    all: buildType(null, null, 'all')
};
