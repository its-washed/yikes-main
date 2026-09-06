const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'massemoji', description: 'Add emojis to a message', usage: ',massemoji [messageId] [emoji]' },
    aliases: ['me'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const msgId = args[0];
        const emoji = args[1];
        if (!msgId || !emoji) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,massemoji [messageId] [emoji]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            await msg.react(emoji);
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: 'Reaction added!' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not add reaction.')] }); }
    }
};
