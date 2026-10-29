const { errorEmbed, permissionDenied } = require('../../utils/embeds');
const { warn } = require('../../utils/context');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    permission: "manage messages",
    data: { name: 'pin', description: "Pin a message", usage: ',pin [messageId]' },
    aliases: [],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [permissionDenied(message, 'manage_messages')] });
        const target = (message.reference && message.reference.messageId) || args[0];
        if (!target) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,pin [messageId] or reply to the message')] });
        try {
            const msg = await message.channel.messages.fetch(target);
            if (msg.pinned) return warn(message, 'That message is already **pinned**');
            try {
                await msg.pin();
            } catch (err) {
                if (String(err.message).includes("can't execute action on a system message")) {
                    return warn(message, "You can't **pin** system messages");
                }
                return message.reply({ embeds: [errorEmbed('Error', 'Could not pin message.')] });
            }
            await message.react('✅').catch(() => {});
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not pin message.')] }); }
    }
};
