const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgebefore', description: 'Delete messages before a message ID', usage: ',purgebefore [messageId] [amount]' },
    aliases: ['pbf'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const targetId = args[0];
        if (!targetId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,purgebefore [messageId] [amount]')] });
        const amount = parseInt(args[1]) || 50;
        try {
            const target = await message.channel.messages.fetch(targetId);
            const msgs = await message.channel.messages.fetch({ limit: 100, before: targetId });
            const toDelete = msgs.filter(m => m.id !== message.id).first(amount);
            if (!toDelete.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages before that ID.')] });
            const deleted = await message.channel.bulkDelete(toDelete, true);
            return message.reply({ embeds: [successEmbed('Purge Before', `Deleted **${deleted.size}** messages before that message.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch that message.')] }); }
    }
};
