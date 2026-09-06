const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pollresults', description: 'Check poll results', usage: ',pollresults [messageId]' },
    aliases: ['pollres'],
    cooldown: 5,
    async execute(message, args) {
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Missing Message ID', 'Usage: ,pollresults [messageId]')] });
        try {
            const msg = await message.channel.messages.fetch(msgId);
            const results = msg.reactions.cache.map(r => `${r.emoji}: ${r.count - 1} votes`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Poll Results', description: results || 'No votes yet.' })] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not fetch message.')] }); }
    }
};
