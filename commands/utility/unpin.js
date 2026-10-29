const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { warn } = require('../../utils/context');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    permission: "manage messages",
    data: { name: 'unpin', description: "Unpin a message", usage: ',unpin [messageId]' },
    aliases: [],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,unpin [messageId]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            if (!msg.pinned) return warn(message, 'That message is **not** pinned');
            await msg.unpin();
            return message.reply({ embeds: [createEmbed({ color: 0x39ffb8, description: 'Message unpinned!' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not unpin message.')] }); }
    }
};
