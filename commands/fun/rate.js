const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'rate',
        description: 'Rate something',
        usage: ',rate [thing]'
    },
    aliases: ['rating'],
    cooldown: 3,

    async execute(message, args) {
        const thing = args.join(' ');
        if (!thing) return message.reply({ embeds: [errorEmbed('Missing Thing', 'Usage: ,rate [thing]')] });

        const rating = Math.floor(Math.random() * 11);
        const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Rating', description: `I rate **${thing}** a **${rating}/10**\n\n\`${bar}\`` })] });
    }
};
