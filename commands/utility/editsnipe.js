const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { warn } = require('../../utils/context');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'editsnipe', description: "Snipe the latest message that was edited", usage: ',editsnipe [#channel]' },
    aliases: ['es'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        }

        const channel = message.mentions.channels.first() || message.channel;
        const snipe = client.editSnipes?.get(channel.id);
        if (!snipe) return warn(message, 'No edit snipes found in this channel');

        return message.reply({
            embeds: [createEmbed({
                color: 0xffd600,
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
