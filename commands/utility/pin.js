const { errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'pin', description: 'Pin a message by ID or reply to it', usage: ',pin [messageId]' },
    aliases: ['pinmessage'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        const target = (message.reference && message.reference.messageId) || args[0];
        if (!target) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,pin [messageId] or reply to the message')] });
        try {
            const msg = await message.channel.messages.fetch(target);
            await msg.pin();
            await message.react('✅').catch(() => {});
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not pin message.')] }); }
    }
};
