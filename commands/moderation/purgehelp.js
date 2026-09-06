const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'purgehelp', description: 'Purge command help', usage: ',purgehelp' },
    aliases: ['purgelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Purge Help', description: '`,purge [amount]` — Delete messages\n`,purgebots [amount]` — Delete bot messages\n`,purgeuser [@user] [amount]` — Delete user messages\n`,purgeimages [amount]` — Delete messages with images\n`,purgelinks [amount]` — Delete messages with links\n`,purgeembeds [amount]` — Delete messages with embeds\n`,purgecontains [text] [amount]` — Delete messages containing text\n`,purgepinned [amount]` — Delete unpinned messages\n`,purgebefore [messageId] [amount]` — Delete before message\n`,purgeafter [messageId] [amount]` — Delete after message' })] });
    }
};
