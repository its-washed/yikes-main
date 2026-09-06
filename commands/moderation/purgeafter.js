const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgeafter', description: 'Delete messages after a message ID', usage: ',purgeafter [messageId] [amount]' },
    aliases: ['pa'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const targetId = args[0];
        if (!targetId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,purgeafter [messageId] [amount]')] });
        const amount = parseInt(args[1]) || 50;
        try {
            const msgs = await message.channel.messages.fetch({ limit: 100, after: targetId });
            const toDelete = msgs.filter(m => m.id !== message.id).first(amount);
            if (!toDelete.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages after that ID.')] });
            const deleted = await message.channel.bulkDelete(toDelete, true);
            return message.reply({ embeds: [successEmbed('Purge After', `Deleted **${deleted.size}** messages after that message.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch that message.')] }); }
    }
};
