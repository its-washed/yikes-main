const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pin', description: 'Pin a message by ID', usage: ',pin [messageId]' },
    aliases: ['pinmessage'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,pin [messageId]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            await msg.pin();
            return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: 'Message pinned!' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not pin message.')] }); }
    }
};
