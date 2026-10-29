const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { parseChannel } = require('../../utils/helpers');
const { getUserActivity } = require('../../utils/activity');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

const FLAGS = ['role', 'bonus', 'messages', 'level', 'invites', 'ignore'];
const COLUMNS = { role: 'required_role', bonus: 'required_bonus', messages: 'required_messages', level: 'required_level', invites: 'required_invites', ignore: 'required_ignore' };

function parseJson(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
        return fallback;
    }
}

function finishSeconds(row) {
    return Math.floor(new Date(row.finish).getTime() / 1000);
}

function convertRole(message, token) {
    if (!token) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned && String(token).includes(mentioned.id)) return mentioned;
    const cleaned = String(token).replace(/[<@&>]/g, '');
    const byId = message.guild.roles.cache.get(cleaned);
    if (byId) return byId;
    const name = String(token).toLowerCase();
    const exact = message.guild.roles.cache.filter(r => r.id !== message.guild.id && r.name.toLowerCase() === name);
    if (exact.size === 1) return exact.first();
    return null;
}

function buildEmbed(row) {
    const ends = finishSeconds(row);
    const embed = createEmbed({
        color: COLORS.NEUTRAL,
        title: row.title,
        timestamp: false,
        description: `**Ends:** <t:${ends}:f> (<t:${ends}:R>)\n**Hosted by:** <@${row.host}>\n**Winners:** ${row.winners}`,
        fields: [{ name: 'Entries', value: String(parseJson(row.members, []).length), inline: true }]
    });
    if (row.required_bonus) embed.addFields({ name: 'Bonus', value: `<@&${row.required_bonus}>`, inline: true });
    if (row.required_role) embed.addFields({ name: 'Role', value: `<@&${row.required_role}>`, inline: true });
    if (row.required_messages) embed.addFields({ name: 'Messages', value: String(row.required_messages), inline: true });
    if (row.required_level) embed.addFields({ name: 'Level', value: String(row.required_level), inline: true });
    if (row.required_invites) embed.addFields({ name: 'Invites', value: String(row.required_invites), inline: true });
    if (row.required_ignore) embed.addFields({ name: 'Ignore', value: `<@&${row.required_ignore}>`, inline: true });
    return embed;
}

function entryRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent:giveaway_enter').setEmoji('🎉').setLabel('Enter').setStyle(ButtonStyle.Primary)
    );
}

function requirementError(guild, member, row) {
    if (row.required_role && !member.roles.cache.has(String(row.required_role))) {
        return `You need the <@&${row.required_role}> role to enter this giveaway`;
    }
    if (row.required_ignore && member.roles.cache.has(String(row.required_ignore))) {
        return `You can't enter this giveaway with the <@&${row.required_ignore}> role`;
    }
    if (row.required_level) {
        const level = first('SELECT level FROM level_user WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
        if (!level || Number(level.level || 0) < Number(row.required_level)) {
            return `You need to be level **${row.required_level}** to enter this giveaway`;
        }
    }
    if (row.required_invites) {
        const invites = first('SELECT regular_count, bonus FROM invites WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
        const total = invites ? Number(invites.regular_count || 0) + Number(invites.bonus || 0) : 0;
        if (total < Number(row.required_invites)) {
            return `You need at least **${row.required_invites} invites** to enter this giveaway`;
        }
    }
    if (row.required_messages) {
        const activity = getUserActivity(String(guild.id), String(member.id));
        if (Number(activity.messages || 0) < Number(row.required_messages)) {
            return `You need at least **${row.required_messages} messages** to enter this giveaway`;
        }
    }
    return null;
}

async function fetchTargetMessage(message, token) {
    const id = String(token || '').replace(/[^\d]/g, '');
    if (!id) return null;
    return message.channel.messages.fetch(id).catch(() => null);
}

function giveawayRow(guildId, channelId, messageId) {
    return first('SELECT * FROM giveaway WHERE guild_id = ? AND channel_id = ? AND message_id = ?', guildId, channelId, messageId);
}

async function endGiveaway(client, row) {
    const channelId = String(row.channel_id);
    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
    let sent = null;
    if (channel) sent = await channel.messages.fetch(String(row.message_id)).catch(() => null);

    const members = parseJson(row.members, []);
    const weighted = [];
    for (const memberId of members) {
        weighted.push(memberId);
        if (row.required_bonus && channel) {
            const member = channel.guild.members.cache.get(String(memberId));
            if (member && member.roles.cache.has(String(row.required_bonus))) weighted.push(memberId);
        }
    }

    const winners = [];
    const wanted = Math.max(1, Number(row.winners || 1));
    const pool = [...weighted];
    while (pool.length && winners.length < Math.min(wanted, new Set(members).size)) {
        const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (!winners.includes(pick)) winners.push(pick);
    }

    run('DELETE FROM giveaway WHERE guild_id = ? AND message_id = ?', row.guild_id, row.message_id);
    run('INSERT OR REPLACE INTO giveaway_ended (channel_id, message_id, members) VALUES (?, ?, ?)', row.channel_id, row.message_id, JSON.stringify(members));

    const prize = row.title;
    if (sent) {
        const embed = sent.embeds[0]
            ? EmbedBuilder.from(sent.embeds[0]).setColor(COLORS.WARNING).setDescription(`${sent.embeds[0].description}\n\n**Ended**`)
            : null;
        await sent.edit({ embeds: embed ? [embed] : [], components: [] }).catch(() => {});
    }
    if (!channel) return null;
    if (!winners.length) {
        return channel.send({ content: `🎉 The giveaway for **${prize}** has ended — no valid participants.` }).catch(() => null);
    }
    const mentions = winners.map(winner => `<@${winner}>`).join(', ');
    return channel.send({ content: `🎉 **${prize}** — congratulations ${mentions}, you won!` }).catch(() => null);
}

function handleEnter(interaction) {
    const row = first('SELECT * FROM giveaway WHERE guild_id = ? AND message_id = ?', interaction.guild.id, interaction.message.id);
    if (!row) {
        return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true }).catch(() => {});
    }
    const problem = requirementError(interaction.guild, interaction.member, row);
    if (problem) {
        return interaction.reply({ content: problem, ephemeral: true }).catch(() => {});
    }
    const members = parseJson(row.members, []);
    const index = members.indexOf(String(interaction.user.id));
    if (index >= 0) members.splice(index, 1);
    else members.push(String(interaction.user.id));
    run('UPDATE giveaway SET members = ? WHERE guild_id = ? AND message_id = ?', JSON.stringify(members), interaction.guild.id, interaction.message.id);
    const updated = buildEmbed({ ...row, members: JSON.stringify(members) });
    return interaction.update({ embeds: [updated] }).catch(() => {});
}

module.exports = {
    data: { name: 'giveaway', description: 'Manage giveaways in your server', usage: ',giveaway <create|edit|end|delete|reroll|list|requirements>' },
    aliases: ['gw'],
    cooldown: 5,
    subcommands: ['create', 'edit', 'end', 'delete', 'reroll', 'list', 'requirements'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: create, edit, end, delete, reroll, list, requirements');
        return sendCard(message, module.exports);
    },
    subs: {
        create: {
            aliases: [],
            data: { name: 'giveaway create', description: 'Start a giveaway with your provided duration, winners and prize description', usage: ',giveaway create <channel> <time> <winners> <prize>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = parseChannel(message, args[0]);
                const seconds = parseTime(args[1]);
                const winners = parseInt(args[2], 10);
                if (!channel || !seconds || !Number.isInteger(winners) || winners < 1 || !args.slice(3).length) {
                    return warn(message, 'Usage: `giveaway create <channel> <time> <winners> <prize>`');
                }
                const active = query('SELECT * FROM giveaway WHERE guild_id = ?', message.guild.id);
                if (active.length >= 5) return warn(message, 'You can only have **5 active giveaways** per server.');

                let prize = args.slice(3).join(' ');
                const flags = {};
                prize = prize.replace(/--(role|bonus|messages|level|invites|ignore)\s+(\S+)/g, (match, key, value) => {
                    flags[key] = value;
                    return '';
                }).trim();
                if (!prize) return warn(message, 'Usage: `giveaway create <channel> <time> <winners> <prize>`');

                let role = null;
                let bonus = null;
                let ignore = null;
                let messages = null;
                let level = null;
                let invites = null;

                if (flags.role) {
                    role = convertRole(message, flags.role);
                    if (!role) return warn(message, 'Invalid role provided.');
                }
                if (flags.bonus) {
                    bonus = convertRole(message, flags.bonus);
                    if (!bonus) return warn(message, 'Invalid bonus role provided.');
                }
                if (flags.messages) {
                    messages = parseInt(flags.messages, 10);
                    if (!Number.isInteger(messages)) return warn(message, 'Invalid messages value provided.');
                }
                if (flags.level) {
                    level = parseInt(flags.level, 10);
                    if (!Number.isInteger(level)) return warn(message, 'Invalid level value provided.');
                    if (!first('SELECT * FROM leveling WHERE guild_id = ?', message.guild.id)) {
                        return warn(message, `Leveling is not enabled in this server\n> Use \`${require('../../utils/moderation').prefix(message)}level enable\` to enable it`);
                    }
                }
                if (flags.invites) {
                    invites = parseInt(flags.invites, 10);
                    if (!Number.isInteger(invites)) return warn(message, 'Invalid invites value provided.');
                    if (!first('SELECT * FROM invites_settings WHERE guild_id = ?', message.guild.id)) {
                        return warn(message, `Invites are not enabled in this server\n> Use \`${require('../../utils/moderation').prefix(message)}invites enable\` to enable it`);
                    }
                }
                if (flags.ignore) {
                    ignore = convertRole(message, flags.ignore);
                    if (!ignore) return warn(message, 'Invalid ignore role provided.');
                }

                const finish = new Date(Date.now() + seconds * 1000).toISOString();
                const row = {
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message_id: '0',
                    winners,
                    members: '[]',
                    finish,
                    host: message.author.id,
                    title: prize,
                    required_role: role ? role.id : null,
                    required_bonus: bonus ? bonus.id : null,
                    required_messages: messages,
                    required_level: level,
                    required_invites: invites,
                    required_ignore: ignore ? ignore.id : null
                };

                await approve(message, `Giveaway setup completed! Check ${channel}`);
                const sent = await channel.send({ embeds: [buildEmbed(row)], components: [entryRow()] });
                run('INSERT INTO giveaway (guild_id, channel_id, message_id, winners, members, finish, host, title, required_role, required_bonus, required_messages, required_level, required_invites, required_ignore) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    message.guild.id, channel.id, sent.id, winners, '[]', finish, message.author.id, prize,
                    role ? role.id : null, bonus ? bonus.id : null, messages, level, invites, ignore ? ignore.id : null);
                return sent;
            }
        },
        edit: {
            aliases: [],
            data: { name: 'giveaway edit', description: "Edit a giveaway's settings", usage: ',giveaway edit <price|duration|host|winners>' },
            subcommands: ['price', 'duration', 'host', 'winners'],
            execute: async (message) => sendCard(message, module.exports.subs.edit),
            subs: {
                price: {
                    aliases: [],
                    data: { name: 'giveaway edit price', description: 'Edit the prize of a giveaway', usage: ',giveaway edit price <message> <prize>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const price = args.slice(1).join(' ').trim();
                        if (!target || !price) return warn(message, 'Usage: `giveaway edit price <message> <prize>`');
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        run('UPDATE giveaway SET title = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?', price, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, title: price })] }).catch(() => {});
                        return approve(message, `Updated [\`giveaway\`](${target.url}) prize to **${price}**`);
                    }
                },
                duration: {
                    aliases: [],
                    data: { name: 'giveaway edit duration', description: 'Edit the duration of a giveaway', usage: ',giveaway edit duration <message> <time>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const seconds = parseTime(args[1]);
                        if (!target || !seconds) return warn(message, 'Invalid time parsed, please use 3d, 2h, 1m, 30s, etc.');
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        const finish = new Date(Date.now() + seconds * 1000).toISOString();
                        run('UPDATE giveaway SET finish = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?', finish, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, finish })] }).catch(() => {});
                        return approve(message, `Updated [\`giveaway\`](${target.url}) duration to **${args[1]}**`);
                    }
                },
                host: {
                    aliases: [],
                    data: { name: 'giveaway edit host', description: 'Edit the host of a giveaway', usage: ',giveaway edit host <message> <user>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const host = message.mentions.users.first() || message.client.users.cache.get(String(args[1] || '').replace(/[<@!>]/g, ''));
                        if (!target || !host) return warn(message, 'Usage: `giveaway edit host <message> <user>`');
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        run('UPDATE giveaway SET host = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?', host.id, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, host: host.id })] }).catch(() => {});
                        return approve(message, `Updated [\`giveaway\`](${target.url}) host to **${host}**`);
                    }
                },
                winners: {
                    aliases: [],
                    data: { name: 'giveaway edit winners', description: 'Edit the number of winners of a giveaway', usage: ',giveaway edit winners <message> <winners>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const winners = parseInt(args[1], 10);
                        if (!target || !Number.isInteger(winners) || winners < 1) return warn(message, 'Usage: `giveaway edit winners <message> <winners>`');
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        run('UPDATE giveaway SET winners = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?', winners, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, winners })] }).catch(() => {});
                        return approve(message, `Updated [\`giveaway\`](${target.url}) winners to **${winners}**`);
                    }
                }
            }
        },
        requirements: {
            aliases: [],
            data: { name: 'giveaway requirements', description: "Manage a giveaway's requirements", usage: ',giveaway requirements <add|remove|edit>' },
            subcommands: ['add', 'remove', 'edit'],
            execute: async (message) => sendCard(message, module.exports.subs.requirements),
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'giveaway requirements add', description: 'Add a new requirement to the giveaway', usage: ',giveaway requirements add <message> <flag> <value>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const flag = String(args[1] || '').toLowerCase();
                        const value = args.slice(2).join(' ').trim();
                        if (!target || !FLAGS.includes(flag) || !value) {
                            return warn(message, 'Usage: `giveaway requirements add <message> <role|bonus|messages|level|invites|ignore> <value>`');
                        }
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        const column = COLUMNS[flag];
                        if (check[column]) return warn(message, `The ${flag} requirement is already set`);
                        let stored = null;
                        if (['role', 'bonus', 'ignore'].includes(flag)) {
                            const role = convertRole(message, value);
                            if (!role) return warn(message, 'Invalid role provided.');
                            stored = role.id;
                        } else {
                            stored = parseInt(value, 10);
                            if (!Number.isInteger(stored)) return warn(message, 'Invalid number provided.');
                        }
                        run(`UPDATE giveaway SET ${column} = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?`, stored, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, [column]: stored })] }).catch(() => {});
                        return approve(message, `Added ${flag} requirement to the [\`giveaway\`](${target.url})`);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'giveaway requirements remove', description: 'Remove a requirement from the giveaway', usage: ',giveaway requirements remove <message> <flag>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const flag = String(args[1] || '').toLowerCase();
                        if (!target || !FLAGS.includes(flag)) {
                            return warn(message, 'Usage: `giveaway requirements remove <message> <flag>`');
                        }
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        const column = COLUMNS[flag];
                        if (!check[column]) return warn(message, `The ${flag} requirement is not set and cannot be removed`);
                        run(`UPDATE giveaway SET ${column} = NULL WHERE guild_id = ? AND channel_id = ? AND message_id = ?`, message.guild.id, target.channel.id, target.id);
                        await target.edit({ embeds: [buildEmbed({ ...check, [column]: null })] }).catch(() => {});
                        return approve(message, `Removed ${flag} requirement from the [\`giveaway\`](${target.url})`);
                    }
                },
                edit: {
                    aliases: [],
                    data: { name: 'giveaway requirements edit', description: 'Edit an existing requirement in the giveaway', usage: ',giveaway requirements edit <message> <flag> <value>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const target = await fetchTargetMessage(message, args[0]);
                        const flag = String(args[1] || '').toLowerCase();
                        if (!target || !FLAGS.includes(flag)) {
                            return warn(message, 'Usage: `giveaway requirements edit <message> <flag> <value>`');
                        }
                        const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                        if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                        const column = COLUMNS[flag];
                        if (check[column]) {
                            run(`UPDATE giveaway SET ${column} = NULL WHERE guild_id = ? AND channel_id = ? AND message_id = ?`, message.guild.id, target.channel.id, target.id);
                        }
                        return module.exports.subs.requirements.subs.add.execute(message, args);
                    }
                }
            }
        },
        end: {
            aliases: [],
            data: { name: 'giveaway end', description: 'End an active giveaway early', usage: ',giveaway end <message>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = await fetchTargetMessage(message, args[0]);
                if (!target) return warn(message, 'Usage: `giveaway end <message>`');
                const check = giveawayRow(message.guild.id, target.channel.id, target.id);
                if (!check) return warn(message, 'This message is not a giveaway or it ended if it was one');
                await endGiveaway(message.client, check);
                return approve(message, `Ended giveaway in ${target.channel}`);
            }
        },
        delete: {
            aliases: [],
            data: { name: 'giveaway delete', description: 'Delete a giveaway', usage: ',giveaway delete <message>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = await fetchTargetMessage(message, args[0]);
                if (!target) return warn(message, 'Usage: `giveaway delete <message>`');
                const res = first('SELECT * FROM giveaway WHERE message_id = ? AND guild_id = ?', target.id, message.guild.id);
                if (!res) return warn(message, "This message is not a valid giveaway or doesn't exist");
                run('DELETE FROM giveaway WHERE message_id = ? AND guild_id = ?', target.id, message.guild.id);
                await target.delete().catch(() => {});
                return approve(message, 'The giveaway has been deleted');
            }
        },
        reroll: {
            aliases: [],
            data: { name: 'giveaway reroll', description: 'Reroll a specified number of winners for the giveaway', usage: ',giveaway reroll <message> [winners]' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = await fetchTargetMessage(message, args[0]);
                const winners = parseInt(args[1], 10) || 1;
                if (!target) return warn(message, 'Usage: `giveaway reroll <message> [winners]`');
                const check = first('SELECT * FROM giveaway_ended WHERE channel_id = ? AND message_id = ?', target.channel.id, target.id);
                if (!check) return warn(message, `This message is not a giveaway or it didn't end if it is one. Use \`${require('../../utils/moderation').prefix(message)}gend\` to end the giveaway`);
                const members = parseJson(check.members, []);
                if (members.length < winners) {
                    return warn(message, `Not enough participants to reroll ${winners} winners. There are only ${members.length} participants.`);
                }
                const pool = [...members];
                const picked = [];
                while (pool.length && picked.length < winners) {
                    const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                    if (!picked.includes(pick)) picked.push(pick);
                }
                return message.reply({ content: `**New winners:** ${picked.map(winner => `<@${winner}>`).join(', ')}` });
            }
        },
        list: {
            aliases: [],
            data: { name: 'giveaway list', description: 'List every active giveaway in the server', usage: ',giveaway list' },
            execute: async (message) => {
                const results = query('SELECT * FROM giveaway WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no giveaways');
                const lines = results.map(result =>
                    `[**${result.title}**](https://discord.com/channels/${message.guild.id}/${result.channel_id}/${result.message_id}) ends <t:${finishSeconds(result)}:R>`);
                return paginate(message, lines, `Giveaways in ${message.guild.name}`);
            }
        }
    },
    buildEmbed,
    endGiveaway,
    handleEnter,
    requirementError
};
