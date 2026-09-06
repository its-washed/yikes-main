const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'purgeembeds', description: 'Delete messages with embeds', usage: ',purgeembeds [amount]' },
    aliases: ['pe'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const embedMsgs = msgs.filter(m => m.embeds.length > 0 && m.id !== message.id).first(amount);
        if (!embedMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No messages with embeds.')] });
        const deleted = await message.channel.bulkDelete(embedMsgs, true);
        return message.reply({ embeds: [successEmbed('Purge Embeds', `Deleted **${deleted.size}** messages with embeds.`)] });
    }
};
