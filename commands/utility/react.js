const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'react', description: 'Add reaction to bot message', usage: ',react [emoji]' },
    aliases: ['addreaction'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const emoji = args[0];
        if (!emoji) return message.reply({ embeds: [errorEmbed('Missing Emoji', 'Usage: ,react [emoji]')] });
        const msg = await message.reply({ content: 'React to this message!' });
        try { await msg.react(emoji); } catch { return message.reply({ embeds: [errorEmbed('Invalid Emoji', 'Could not add that emoji.')] }); }
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: 'Reaction added!' })] });
    }
};
