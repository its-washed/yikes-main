const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'purgepinned', description: 'Delete unpinned messages', usage: ',purgepinned [amount]' },
    aliases: ['pp'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const amount = parseInt(args[0]) || 50;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const unpinned = msgs.filter(m => !m.pinned && m.id !== message.id).first(amount);
        if (!unpinned.length) return message.reply({ embeds: [errorEmbed('Nothing Found', 'No unpinned messages.')] });
        const deleted = await message.channel.bulkDelete(unpinned, true);
        return message.reply({ embeds: [successEmbed('Purge Unpinned', `Deleted **${deleted.size}** unpinned messages.`)] });
    }
};
