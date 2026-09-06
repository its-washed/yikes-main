const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'removereaction', description: 'Remove a reaction from a message', usage: ',removereaction [messageId] [emoji]' },
    aliases: ['delreaction'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing Message ID', 'Usage: ,removereaction [messageId] [emoji]')] });
        try {
            const target = await message.channel.messages.fetch(msgId);
            await target.reactions.removeAll();
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: 'All reactions removed.' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch message.')] }); }
    }
};
