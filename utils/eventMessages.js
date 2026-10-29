const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('./database');
const { warn, approve, paginate, parseTime, confirm } = require('./context');
const { needPerm, needBotPerm, formatTimespan } = require('./moderation');
const { parseChannel } = require('./helpers');
const { scriptPayload, altConvert } = require('./embedScript');
const { createEmbed } = require('./embeds');
const { COLORS, EMOJIS } = require('./styles');

const LIMIT = 10;

function iconOf(guild) {
    return guild.icon ? guild.iconURL({ size: 256 }) : undefined;
}

function templateOf(code) {
    if (!code) return code;
    const row = first('SELECT embed FROM embeds_templates WHERE code = ?', code);
    return row && row.embed ? row.embed : code;
}

async function sendTest(message, table, channel) {
    if (!channel) throw new Error(`There is no ${table} message in this channel`);
    const me = channel.guild.members.me;
    const perms = channel.permissionsFor(me);
    if (!perms || !perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks)) {
        throw new Error(`I don't have permissions to send the ${table} message in ${channel}`);
    }
    const row = first(`SELECT * FROM ${table} WHERE channel_id = ?`, channel.id);
    if (!row) throw new Error(`There is no ${table} message in this channel`);
    const payload = scriptPayload(altConvert(message.member, row.message));
    const sent = await channel.send(payload);
    return approve(message, `Sent the message ${sent.url}`);
}

function resolveChannel(message, token) {
    if (!token) return null;
    return parseChannel(message, token) || null;
}

function eventGroup(table, displayName, opts = {}) {
    const withChannel = opts.withChannel !== false;

    const DESC = {
        'leave add': 'Add a goodbye message for a channel',
        'leave remove': 'Remove a goodbye message from a channel',
        'leave list': 'View goodbye message for a channel',
        'leave test': 'Test the leave message in a channel',
        'boost add': 'Add a boost message for a channel',
        'boost list': 'View boost message for a channel',
        'boost test': 'Test the boost message in a channel',
        'welcome add': 'Add a welcome message for a channel',
        'welcome delete': 'Delete a welcome message'
    };
    const desc = (key, fallback) => DESC[`${table} ${key}`] || fallback;

    const subs = {};

    if (withChannel) {
        subs.add = {
            aliases: [],
            data: { name: `${table} add`, description: desc('add', `Add a ${displayName} for a channel`), usage: `,${table} add <channel> <message>` },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = resolveChannel(message, args[0]);
                const code = args.slice(1).join(' ').trim();
                if (!channel || !code) return warn(message, 'Usage: `' + table + ' add <channel> <message>`');
                const rows = query(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (rows.length >= LIMIT) return warn(message, `You can only have **${LIMIT} ${displayName} messages** per server.`);
                const value = templateOf(code);
                const check = first(`SELECT * FROM ${table} WHERE channel_id = ?`, channel.id);
                if (check) run(`UPDATE ${table} SET message = ? WHERE channel_id = ?`, value, channel.id);
                else run(`INSERT INTO ${table} (guild_id, channel_id, message) VALUES (?, ?, ?)`, message.guild.id, channel.id, value);
                return approve(message, `Added ${displayName} message to ${channel}\n\`\`\`${value}\`\`\``);
            }
        };

        subs.remove = {
            aliases: [],
            data: { name: `${table} remove`, description: desc('remove', `Remove a ${displayName} message from a channel`), usage: `,${table} remove <channel>` },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = resolveChannel(message, args[0]);
                if (!channel) return warn(message, 'Usage: `' + table + ' remove <channel>`');
                if (!first(`SELECT * FROM ${table} WHERE channel_id = ?`, channel.id)) {
                    return warn(message, `There is no ${displayName} message configured in this channel`);
                }
                run(`DELETE FROM ${table} WHERE channel_id = ?`, channel.id);
                return approve(message, `Deleted the ${displayName} message from ${channel}`);
            }
        };

        subs.list = {
            aliases: [],
            data: { name: `${table} list`, description: desc('list', `View all ${displayName} messages`), usage: `,${table} list` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (!rows.length) return warn(message, `There is no ${displayName} message configured in this server`);
                const lines = [];
                rows.forEach((row, index) => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    lines.push(`**${channel ? channel : row.channel_id}** — ${index + 1}/${rows.length}`);
                    lines.push(`\`\`\`${row.message}\`\`\``);
                });
                return paginate(message, lines, `${displayName.charAt(0).toUpperCase() + displayName.slice(1)} Configuration`, { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        };

        subs.test = {
            aliases: [],
            data: { name: `${table} test`, description: desc('test', `View ${displayName} message for a channel`), usage: `,${table} test <channel>` },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = resolveChannel(message, args[0]);
                try {
                    return await sendTest(message, table, channel);
                } catch (err) {
                    return warn(message, err.message);
                }
            }
        };

        subs.reset = {
            aliases: [],
            data: { name: `${table} reset`, description: `Remove all the ${displayName} messages`, usage: `,${table} reset` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (!rows.length) return warn(message, `You have **no** ${displayName} messages in this server`);
                return confirm(message, `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **RESET** all ${displayName} messages in this server?`,
                    async (interaction) => {
                        run(`DELETE FROM ${table} WHERE guild_id = ?`, interaction.guild.id);
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Deleted all ${displayName} messages in this server` })],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.APPROVE} ${interaction.user}: ${displayName} messages deletion got canceled` })],
                            components: []
                        }).catch(() => {});
                    });
            }
        };

        if (opts.deleteGroup) {
            subs.delete = {
                aliases: [],
                data: { name: `${table} delete`, description: desc('delete', `Delete the ${displayName} message`), usage: `,${table} delete <enable|disable>` },
                subcommands: ['enable', 'disable'],
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    return require('./helpCard').sendCard(message, { data: { name: `${table} delete`, description: desc('delete', `Delete the ${displayName} message`), usage: `,${table} delete <enable|disable>` }, subcommands: ['enable', 'disable'], subUsages: {} });
                },
                subs: {
                    enable: {
                        aliases: [],
                        data: { name: `${table} delete enable`, description: `Enable the ${displayName} message deletion`, usage: `,${table} delete enable <channel> <time>` },
                        execute: async (message, args) => {
                            if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                            const channel = resolveChannel(message, args[0]);
                            const seconds = parseTime(args[1]);
                            if (!channel || !seconds) return warn(message, 'Usage: `' + table + ' delete enable <channel> <time>`');
                            if (!first(`SELECT * FROM ${table} WHERE guild_id = ? AND channel_id = ?`, message.guild.id, channel.id)) {
                                return warn(message, 'There is no welcome message configured in this channel');
                            }
                            run(`UPDATE ${table} SET "delete" = 1, duration = ? WHERE channel_id = ?`, seconds, channel.id);
                            return approve(message, `Enabled the ${displayName} message deletion in ${channel} after ${formatTimespan(seconds)} when a user left`);
                        }
                    },
                    disable: {
                        aliases: [],
                        data: { name: `${table} delete disable`, description: `Disable the ${displayName} message deletion`, usage: `,${table} delete disable <channel>` },
                        execute: async (message, args) => {
                            if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                            const channel = resolveChannel(message, args[0]);
                            if (!channel) return warn(message, 'Usage: `' + table + ' delete disable <channel>`');
                            if (!first(`SELECT * FROM ${table} WHERE guild_id = ? AND channel_id = ?`, message.guild.id, channel.id)) {
                                return warn(message, 'There is no welcome message configured in this channel');
                            }
                            run(`UPDATE ${table} SET "delete" = 0, duration = NULL WHERE channel_id = ?`, channel.id);
                            return approve(message, `Disabled the ${displayName} message deletion in ${channel}`);
                        }
                    }
                }
            };
        }
    } else {
        subs.add = {
            aliases: [],
            data: { name: `${table} add`, description: `Add a ${displayName} message`, usage: `,${table} add <message>` },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const code = args.join(' ').trim();
                if (!code) return warn(message, 'Usage: `' + table + ' add <message>`');
                const value = templateOf(code);
                const check = first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (check) run(`UPDATE ${table} SET message = ? WHERE guild_id = ?`, value, message.guild.id);
                else run(`INSERT INTO ${table} (guild_id, message) VALUES (?, ?)`, message.guild.id, value);
                return approve(message, `Added ${displayName} message\n\`\`\`${value}\`\`\``);
            }
        };
        subs.remove = {
            aliases: [],
            data: { name: `${table} remove`, description: `Remove the ${displayName} message`, usage: `,${table} remove` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id)) {
                    return warn(message, `There is no ${displayName} message configured in this server`);
                }
                run(`DELETE FROM ${table} WHERE guild_id = ?`, message.guild.id);
                return approve(message, `Deleted the ${displayName} message`);
            }
        };
        subs.list = {
            aliases: [],
            data: { name: `${table} list`, description: `View the ${displayName} message`, usage: `,${table} list` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (!check) return warn(message, `There is no ${displayName} message configured in this server`);
                return message.reply({
                    embeds: [createEmbed({ color: COLORS.NEUTRAL, title: `${displayName.charAt(0).toUpperCase() + displayName.slice(1)} Configuration`, description: `\`\`\`${check.message}\`\`\`` })]
                });
            }
        };
        subs.test = {
            aliases: [],
            data: { name: `${table} test`, description: `Test the ${displayName} message`, usage: `,${table} test` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id);
                if (!check) return warn(message, `There is no ${displayName} message configured in this server`);
                try {
                    const payload = scriptPayload(altConvert(message.member, check.message));
                    const row = new (require('discord.js').ActionRowBuilder).addComponents(
                        new (require('discord.js').ButtonBuilder).setCustomId('joindm_server').setLabel(`Sent from server: ${message.guild.name}`).setStyle('Secondary').setDisabled(true)
                    );
                    await message.author.send({ ...payload, components: [row] });
                    return approve(message, 'Sent the message in your DMs');
                } catch (err) {
                    return warn(message, `An error occurred while sending the message\n\`\`\`${err.message}\`\`\``);
                }
            }
        };
        subs.reset = {
            aliases: [],
            data: { name: `${table} reset`, description: `Remove the ${displayName} message`, usage: `,${table} reset` },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!first(`SELECT * FROM ${table} WHERE guild_id = ?`, message.guild.id)) {
                    return warn(message, `There is no ${displayName} message configured in this server`);
                }
                return confirm(message, `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **RESET** the ${displayName} message in this server?`,
                    async (interaction) => {
                        run(`DELETE FROM ${table} WHERE guild_id = ?`, interaction.guild.id);
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Deleted the ${displayName} message in this server` })],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        return interaction.update({
                            embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.APPROVE} ${interaction.user}: ${displayName} message deletion got canceled` })],
                            components: []
                        }).catch(() => {});
                    });
            }
        };
    }

    return subs;
}

module.exports = { eventGroup, sendTest, templateOf };
