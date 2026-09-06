const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'reverse',
        description: 'Reverse text',
        usage: ',reverse [text]'
    },
    aliases: ['flip'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,reverse [text]')] });

        const reversed = text.split('').reverse().join('');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reversed', description: `\`${reversed}\`` })] });
    }
};
