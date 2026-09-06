const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'purgeuser', description: 'Delete messages from a specific user', usage: ',purgeuser [@user] [amount]' },
    aliases: ['pu'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,purgeuser [@user] [amount]')] });
        const amount = parseInt(args[1]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const userMsgs = msgs.filter(m => m.author.id === target.id && m.id !== message.id).first(amount);
        if (!userMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages from that user.')] });
        const deleted = await message.channel.bulkDelete(userMsgs, true);
        return message.reply({ embeds: [successEmbed('Purge User', `Deleted **${deleted.size}** messages from **${target.tag}**.`)] });
    }
};
