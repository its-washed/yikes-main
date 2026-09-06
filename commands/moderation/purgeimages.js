const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgeimages', description: 'Delete messages with images', usage: ',purgeimages [amount]' },
    aliases: ['pi'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const imgMsgs = msgs.filter(m => m.attachments.size > 0 && m.id !== message.id).first(amount);
        if (!imgMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages with images.')] });
        const deleted = await message.channel.bulkDelete(imgMsgs, true);
        return message.reply({ embeds: [successEmbed('Purge Images', `Deleted **${deleted.size}** messages with images.`)] });
    }
};
