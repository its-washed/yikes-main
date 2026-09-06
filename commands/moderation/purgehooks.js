const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgehooks', description: 'Delete webhook messages', usage: ',purgehooks [amount]' },
    aliases: ['ph'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const hookMsgs = msgs.filter(m => m.webhookId && m.id !== message.id).first(amount);
        if (!hookMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No webhook messages.')] });
        const deleted = await message.channel.bulkDelete(hookMsgs, true);
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Deleted **${deleted.size}** webhook messages.` })] });
    }
};
