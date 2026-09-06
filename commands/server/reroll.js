const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'reroll', description: 'Reroll a giveaway', usage: ',reroll [messageId]' },
    aliases: [],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing Message ID', 'Usage: ,reroll [messageId]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            const reactions = msg.reactions.cache.get('🎉');
            if (!reactions) return message.reply({ embeds: [errorEmbed('Not Found', 'No reactions found.')] });
            const users = await reactions.users.fetch();
            const entries = users.filter(u => !u.bot);
            if (entries.size === 0) return message.reply({ embeds: [errorEmbed('No Entries', 'No valid entries.')] });
            const winner = entries.random();
            return message.reply({ embeds: [createEmbed({ color: 0x00d26a, title: 'Reroll', description: `New winner: ${winner}` })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch message.')] }); }
    }
};
