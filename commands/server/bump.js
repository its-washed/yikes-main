const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'bump',
        description: 'Remind to bump your server on Disboard',
        usage: ',bump [enable|disable|channel|time|set|thankmessage|remindermessage|status]'
    },
    aliases: ['bumpreminder', 'bumpremind'],
    cooldown: 10,

    async execute(message, args, client, config) {
        const action = args[0]?.toLowerCase();

        const adminActions = ['enable', 'disable', 'channel', 'time', 'set'];
        if (adminActions.includes(action) && !isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const manageActions = ['thankmessage', 'remindermessage'];
        if (manageActions.includes(action) && !hasPermission(message.member, PermissionFlagsBits.ManageGuild)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Server` permission.')] });
        }

        if (!action || action === 'status') {
            const br = config.bumpReminder || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Bump Reminder Status',
                    fields: [
                        { name: 'Enabled', value: br.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: br.channel ? `<#${br.channel}>` : 'Not set', inline: true },
                        { name: 'Interval', value: br.interval ? `${br.interval}h` : '2h (default)', inline: true },
                        { name: 'Last Bump', value: br.lastBump ? `<t:${Math.floor(br.lastBump / 1000)}:R>` : 'Never', inline: true },
                        { name: 'Thank Message', value: br.thankMessage || '*Default*', inline: false },
                        { name: 'Reminder Message', value: br.reminderMessage || '*Default*', inline: false }
                    ]
                })]
            });
        }

        if (action === 'enable') {
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: true }
            });
            return message.reply({ embeds: [successEmbed('Bump Reminder Enabled', 'Bump reminders are now active.')] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: false }
            });
            return message.reply({ embeds: [successEmbed('Bump Reminder Disabled', 'Bump reminders are now off.')] });
        }

        if (action === 'channel') {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, channel: channel.id }
            });
            return message.reply({ embeds: [successEmbed('Bump Channel', `Reminders will be sent to ${channel}.`)] });
        }

        if (action === 'time') {
            const hours = parseInt(args[1]) || 2;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, interval: hours }
            });
            return message.reply({ embeds: [successEmbed('Bump Interval', `Reminders set every **${hours}** hour(s).`)] });
        }

        if (action === 'set') {
            if (!config.bumpReminder?.channel) {
                return message.reply({ embeds: [errorEmbed('No Channel', 'Set a channel first with `,bump channel #channel`.')] });
            }

            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: true, lastBump: Date.now() }
            });

            const channel = message.guild.channels.cache.get(config.bumpReminder.channel);
            if (channel) {
                const interval = config.bumpReminder.interval || 2;
                channel.send({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: 'Bump Reminder Set',
                        description: `I'll remind you to bump in **${interval}** hour(s).`
                    })]
                }).catch(() => {});
            }

            return message.reply({ embeds: [successEmbed('Bump Recorded', `Next reminder in **${config.bumpReminder?.interval || 2}** hour(s).`)] });
        }

        if (action === 'thankmessage') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return message.reply({ embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Thank Message',
                    description: 'Set the message sent when someone bumps.\n\n**Current:** ' + (config.bumpReminder?.thankMessage || '*Default*') + '\n\n**Variables:** `{user.mention}`, `{user.name}`, `{guild.name}`, `{guild.count}`, `{interval}`\n**Usage:** `,bump thankmessage Thank you {user.mention} for bumping!`\n**,bump thankmessage default` to reset**'
                })] });
            }

            const value = text.toLowerCase() === 'default' ? null : text;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, thankMessage: value }
            });
            return message.reply({ embeds: [successEmbed('Thank Message Updated', value ? `Set to: ${value}` : 'Reset to default.')] });
        }

        if (action === 'remindermessage') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return message.reply({ embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Reminder Message',
                    description: 'Set the reminder message sent when it\'s time to bump.\n\n**Current:** ' + (config.bumpReminder?.reminderMessage || '*Default*') + '\n\n**Variables:** `{guild.name}`, `{guild.count}`\n**Usage:** `,bump remindermessage Time to bump {guild.name}!`\n**,bump remindermessage default` to reset**'
                })] });
            }

            const value = text.toLowerCase() === 'default' ? null : text;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, reminderMessage: value }
            });
            return message.reply({ embeds: [successEmbed('Reminder Message Updated', value ? `Set to: ${value}` : 'Reset to default.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `enable`, `disable`, `channel`, `time`, `set`, `thankmessage`, `remindermessage`, `status`')] });
    }
};
