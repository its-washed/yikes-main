const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'editsnipe', description: 'Snipe the last edited message', usage: ',editsnipe [#channel]' },
    aliases: ['esnipe'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const snipe = client.editSnipes?.get(channel.id);
        if (!snipe) return message.reply({ embeds: [errorEmbed('Nothing', 'No edited messages found.')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Edit Sniped',
                author: { name: snipe.author?.tag || 'Unknown', icon_url: snipe.author?.displayAvatarURL() },
                fields: [
                    { name: 'Before', value: snipe.oldContent || '(empty)', inline: false },
                    { name: 'After', value: snipe.newContent || '(empty)', inline: false }
                ],
                timestamp: snipe.timestamp ? new Date(snipe.timestamp).toISOString() : undefined
            })]
        });
    }
};
