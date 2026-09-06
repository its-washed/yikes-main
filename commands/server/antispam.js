const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'antispam',
        description: 'Configure anti-spam system',
        usage: ',antispam [enable|disable] [threshold] [interval]'
    },
    aliases: ['as'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const as = config.antispam || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Anti-Spam Status',
                    fields: [
                        { name: 'Enabled', value: as.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Threshold', value: `${as.threshold || 5} messages`, inline: true },
                        { name: 'Interval', value: `${as.interval || 10} seconds`, inline: true }
                    ]
                })]
            });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                antispam: { ...config.antispam, enabled: false }
            });
            return message.reply({ embeds: [successEmbed('Anti-Spam Disabled', 'Anti-spam system has been disabled.')] });
        }

        if (action === 'enable') {
            const threshold = parseInt(args[1]) || 5;
            const interval = parseInt(args[2]) || 10;

            updateGuildConfig(message.guild.id, {
                antispam: { enabled: true, threshold, interval }
            });

            return message.reply({
                embeds: [successEmbed('Anti-Spam Enabled', `Users sending ${threshold}+ messages in ${interval}s will be timed out.`)]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Usage', 'Usage: ,antispam [enable|disable|status] [threshold] [interval]')] });
    }
};
