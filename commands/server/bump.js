const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'bump',
        description: 'Remind to bump your server on Disboard',
        usage: ',bump [enable|disable|channel|time|set]'
    },
    aliases: ['bumpreminder', 'bumpremind'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

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
                        { name: 'Last Bump', value: br.lastBump ? `<t:${Math.floor(br.lastBump / 1000)}:R>` : 'Never', inline: true }
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

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `enable`, `disable`, `channel`, `time`, `set`, `status`')] });
    }
};
