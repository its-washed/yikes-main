const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'purgecontains', description: 'Delete messages containing text', usage: ',purgecontains [text] [amount]' },
    aliases: ['pc'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const text = args[0];
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,purgecontains [text] [amount]')] });
        const amount = parseInt(args[1]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const matches = msgs.filter(m => m.content.toLowerCase().includes(text.toLowerCase()) && m.id !== message.id).first(amount);
        if (!matches.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No matching messages.')] });
        const deleted = await message.channel.bulkDelete(matches, true);
        return message.reply({ embeds: [successEmbed('Purge Contains', `Deleted **${deleted.size}** messages containing "${text}".`)] });
    }
};
