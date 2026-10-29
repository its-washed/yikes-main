const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { needAntinukeAdmin } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');
const { humanizeTime } = require('../../utils/helpers');

function resolveChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase()) || null;
}

function parseSeconds(value) {
    const raw = String(value || '').trim();
    if (/^\d+$/.test(raw)) return Number(raw);
    const parsed = parseTime(raw);
    return parsed;
}

function needNukePerms(message, config) {
    return (async () => {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return false;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return false;
        if (!await needAntinukeAdmin(message, config)) return false;
        return true;
    })();
}

module.exports = {
    permission: "administrator",
    data: { name: 'nuke', description: "Replace the current channel with a new one", usage: ',nuke' },
    aliases: [],
    cooldown: 30,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',nuke add #general 24h',
        remove: ',nuke remove #general',
        list: ',nuke list'
    },

    async execute(message) {
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        }

        const guild = message.guild;
        const communityIds = [guild.rulesChannelId, guild.systemChannelId, guild.publicUpdatesChannelId].filter(Boolean);
        if (communityIds.includes(message.channel.id)) {
            return warn(message, "You can't delete channels that are **required** by community servers");
        }

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xff3939,
                title: 'Nuke Channel',
                description: `${message.author} : Are you sure you want to nuke this channel?\nThis will delete the current channel and create a new one with the same name & permissions.\nThis action cannot be undone, and WILL NOT reconfigure anything you've set with this bot`
            })],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('nuke_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('nuke_no').setLabel('No').setStyle(ButtonStyle.Danger)
                )
            ]
        });

        const collector = confirm.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'nuke_no') {
                return i.update({ embeds: [errorEmbed('Cancelled', 'Nuke cancelled.')], components: [] });
            }

            await i.deferUpdate();

            try {
                const channel = message.channel;
                const newChannel = await channel.clone();
                await channel.delete('Channel nuked by the server administrator');
                await newChannel.send({
                    embeds: [createEmbed({
                        color: 0xff3939,
                        title: 'Channel Nuked',
                        description: `Nuked by ${message.author.tag}`
                    })]
                });
            } catch (err) {
                await message.reply({
                    embeds: [errorEmbed('Nuke Failed', 'Could not nuke this channel. Make sure I have **Manage Channels** permissions.')]
                }).catch(() => {});
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({
                    embeds: [errorEmbed('Expired', 'Nuke confirmation expired. Run `,nuke` again.')],
                    components: []
                }).catch(() => {});
            }
        });
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'nuke add', description: "Add a nuke schedule for a channel.", usage: ',nuke add #general 24h' },
            async execute(message, args, client, config) {
                if (!await needNukePerms(message, config)) return;
                const channel = resolveChannel(message, args[0]);
                if (!channel) return warn(message, `Channel **${args[0] || ''}** couldn't be found`);
                const schedule = parseSeconds(args[1]);
                if (!schedule) return warn(message, `**${args[1] || ''}** is an invalid timespan\n> Usage: \`nuke add #channel <time>\``);
                if (schedule < 600) return warn(message, 'The minimum nuke schedule is **10 minutes**');
                const existing = first('SELECT 1 AS ok FROM nuke_scheduler WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (existing) return warn(message, 'A nuke schedule for this channel **already** exists');
                run('INSERT INTO nuke_scheduler (guild_id, channel_id, schedule, last_nuke) VALUES (?, ?, ?, ?)',
                    message.guild.id, channel.id, schedule, Date.now() / 1000);
                return approve(message, `Nuke schedule added\n> Channel: ${channel}\n> Schedule: **${humanizeTime(schedule)}**`);
            }
        },

        remove: {
            aliases: ['rm'],
            data: { name: 'nuke remove', description: "Remove a nuke schedule for a channel.", usage: ',nuke remove #general' },
            async execute(message, args, client, config) {
                if (!await needNukePerms(message, config)) return;
                const channel = resolveChannel(message, args[0]) || message.channel;
                const existing = first('SELECT 1 AS ok FROM nuke_scheduler WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (!existing) return warn(message, 'No nuke schedule **found** for this channel');
                run('DELETE FROM nuke_scheduler WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `Nuke schedule removed for ${channel}`);
            }
        },

        list: {
            aliases: [],
            data: { name: 'nuke list', description: "List all nuke schedules for the current server with the next nuke time.", usage: ',nuke list' },
            async execute(message, args, client, config) {
                if (!await needNukePerms(message, config)) return;
                const schedules = query('SELECT channel_id, schedule, last_nuke FROM nuke_scheduler WHERE guild_id = ?', message.guild.id);
                if (!schedules.length) return warn(message, 'No nuke schedules **found** for this server.');
                const lines = schedules.map(entry => {
                    const channel = message.guild.channels.cache.get(String(entry.channel_id));
                    const mention = channel ? `${channel}` : `<#${entry.channel_id}>`;
                    const next = Math.floor((Number(entry.last_nuke) || 0) + (Number(entry.schedule) || 0));
                    return `${mention}: **${humanizeTime(Number(entry.schedule) || 0)}**\n> **Next Nuke:** <t:${next}:R>`;
                });
                return paginate(message, lines, `Nuke Schedules (${schedules.length})`, {
                    name: message.guild.name,
                    icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                });
            }
        }
    }
};
