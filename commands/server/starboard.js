const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'starboard',
        description: 'Configure starboard',
        usage: ',starboard <#channel> [threshold] [emoji] | ,starboard disable | ,starboard status'
    },
    aliases: ['sb'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const sb = config.starboard || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0xffd700,
                    title: 'Starboard Status',
                    fields: [
                        { name: 'Enabled', value: sb.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: sb.channel ? `<#${sb.channel}>` : 'Not set', inline: true },
                        { name: 'Threshold', value: sb.threshold ? sb.threshold.toString() : '5', inline: true },
                        { name: 'Emoji', value: sb.emoji || '⭐', inline: true }
                    ]
                })]
            });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                starboard: { enabled: false, channel: null, threshold: 5, emoji: '⭐' }
            });
            return message.reply({ embeds: [successEmbed('Starboard Disabled', 'Starboard has been disabled.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: `,starboard #channel [threshold] [emoji]`')] });
        }

        const threshold = parseInt(args[1]) || 5;
        const emoji = args[2] || '⭐';

        updateGuildConfig(message.guild.id, {
            starboard: { enabled: true, channel: channel.id, threshold, emoji }
        });

        return message.reply({
            embeds: [successEmbed('Starboard Configured', `Starboard enabled in ${channel}.\nThreshold: **${threshold}** ${emoji}\nEmoji: ${emoji}`)]
        });
    }
};
