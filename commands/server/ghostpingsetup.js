const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'ghostpingsetup',
        description: 'Auto ghost ping new members when they join',
        usage: ',ghostpingsetup [enable|disable|channel] [#channel]'
    },
    aliases: ['gps', 'autogp'],
    cooldown: 10,

    async execute(message, args) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();
        const config = getGuildConfig(message.guild.id);

        if (!action || action === 'status') {
            const gp = config.ghostPing || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Ghost Ping on Join',
                    fields: [
                        { name: 'Enabled', value: gp.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: gp.channel ? `<#${gp.channel}>` : 'Not set', inline: true }
                    ]
                })]
            });
        }

        if (action === 'enable') {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, {
                ghostPing: { enabled: true, channel: channel.id }
            });
            return message.reply({ embeds: [successEmbed('Ghost Ping Enabled', `New members will be ghost pinged in ${channel}.`)] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                ghostPing: { enabled: false, channel: null }
            });
            return message.reply({ embeds: [successEmbed('Ghost Ping Disabled', 'Auto ghost ping on join disabled.')] });
        }

        if (action === 'channel') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Mention a channel.')] });
            updateGuildConfig(message.guild.id, {
                ghostPing: { ...config.ghostPing, channel: channel.id }
            });
            return message.reply({ embeds: [successEmbed('Channel Set', `Ghost ping channel set to ${channel}.`)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `enable`, `disable`, `channel`, `status`')] });
    }
};
