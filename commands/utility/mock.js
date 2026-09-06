const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'mock',
        description: 'MoCk TeXt',
        usage: ',mock [text]'
    },
    aliases: ['spongebob'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,mock [text]')] });

        const mocked = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'MoCk TeXt', description: mocked })] });
    }
};
