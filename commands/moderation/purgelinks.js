const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgelinks', description: 'Delete messages containing links', usage: ',purgelinks [amount]' },
    aliases: ['pl'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const linkMsgs = msgs.filter(m => /https?:\/\//.test(m.content) && m.id !== message.id).first(amount);
        if (!linkMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages with links.')] });
        const deleted = await message.channel.bulkDelete(linkMsgs, true);
        return message.reply({ embeds: [successEmbed('Purge Links', `Deleted **${deleted.size}** messages with links.`)] });
    }
};
