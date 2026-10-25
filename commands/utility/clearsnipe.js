const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

function clearStore(store, id) {
    if (store instanceof Map) {
        const had = store.has(id);
        store.delete(id);
        return had;
    }
    if (store && typeof store === 'object') {
        const had = id in store;
        delete store[id];
        return had;
    }
    return false;
}

module.exports = {
    data: {
        name: 'clearsnipe',
        description: 'Clear the last deleted message and edit snipes so they cannot be sniped',
        usage: ',clearsnipe [#channel]'
    },
    aliases: ['cs', 'snipeclear'],
    cooldown: 3,

    async execute(message) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        const hadSnipe = clearStore(message.client.snipes, channel.id);
        const hadEdit = clearStore(message.client.editSnipes, channel.id);

        if (!hadSnipe && !hadEdit) {
            return message.reply({ embeds: [errorEmbed('Nothing to Clear', `No snipes are stored for ${channel}.`)] });
        }

        const cleared = [hadSnipe ? 'Deleted-message snipe' : null, hadEdit ? 'edit snipe' : null].filter(Boolean).join(' and ');

        return message.reply({
            embeds: [createEmbed({
                color: 0x00d26a,
                title: 'Snipe Cleared',
                description: `${cleared} for ${channel} can no longer be sniped.\nCleared by ${message.author}`
            })]
        });
    }
};
