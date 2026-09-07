const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rate', description: 'Rate something', usage: ',rate <thing>' },
    cooldown: 3,
    async execute(message, args) {
        const thing = args.join(' ') || 'this';
        const rating = Math.floor(Math.random() * 11);
        const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);
        return message.reply({
            embeds: [createEmbed({ color: 0xfbbf24, title: 'Rating', description: `I rate **${thing.slice(0, 100)}** a **${rating}/10**\n\`${bar}\`` })]
        });
    }
};
