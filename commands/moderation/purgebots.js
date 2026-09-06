const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'purgebots', description: 'Delete messages from bots', usage: ',purgebots [amount]' },
    aliases: ['pb'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const botMsgs = msgs.filter(m => m.author.bot && m.id !== message.id).first(amount);
        if (!botMsgs.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No bot messages.')] });
        const deleted = await message.channel.bulkDelete(botMsgs, true);
        return message.reply({ embeds: [successEmbed('Purge Bots', `Deleted **${deleted.size}** bot messages.`)] });
    }
};
