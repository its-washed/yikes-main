const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'unpin', description: 'Unpin a message by ID', usage: ',unpin [messageId]' },
    aliases: ['unpinmessage'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,unpin [messageId]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            await msg.unpin();
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: 'Message unpinned!' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not unpin message.')] }); }
    }
};
