const { errorEmbed, permissionDenied } = require('../../utils/embeds');
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
    aliases: ['snipeclear'],
    cooldown: 3,

    async execute(message) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        const hadSnipe = clearStore(message.client.snipes, channel.id);
        const hadEdit = clearStore(message.client.editSnipes, channel.id);
        const hadReaction = clearStore(message.client.reactionSnipes, channel.id);

        if (!hadSnipe && !hadEdit && !hadReaction) {
            return message.reply({ embeds: [errorEmbed('Nothing to Clear', `nothing has been deleted in ${channel}.`)] });
        }

        await message.react('\u2705').catch(() => {});
    }
};
