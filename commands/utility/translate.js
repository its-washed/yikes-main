const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'translate',
        description: 'Translate text (placeholder)',
        usage: ',translate [text]'
    },
    aliases: ['tr'],
    cooldown: 5,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,translate [text]')] });

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Translate', description: `*[Translation API not connected]*\n\nText: ${text}` })] });
    }
};
