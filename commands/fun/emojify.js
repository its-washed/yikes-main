const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'emojify',
        description: 'Convert text to flag emojis',
        usage: ',emojify [text]'
    },
    aliases: ['flags'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Provide text to emojify.' })] });

        const result = text.toLowerCase().split('').map(c => {
            if (c.match(/[a-z]/)) return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 97);
            return c;
        }).join('');

        return message.reply({ content: result });
    }
};
