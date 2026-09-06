const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'reverse',
        description: 'Reverse text',
        usage: ',reverse [text]'
    },
    aliases: ['reversetext'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,reverse [text]')] });

        const reversed = text.split('').reverse().join('');
        return message.reply({ content: reversed });
    }
};
