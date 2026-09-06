const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'rate',
        description: 'Rate something out of 10',
        usage: ',rate [thing]'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const thing = args.join(' ');
        if (!thing) {
            return message.reply({ embeds: [errorEmbed('Missing Subject', 'What do you want me to rate?')] });
        }

        const rating = Math.floor(Math.random() * 11);
        const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);

        let emoji;
        if (rating >= 8) emoji = '😍';
        else if (rating >= 5) emoji = '😐';
        else if (rating >= 3) emoji = '😬';
        else emoji = '🤮';

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Rate',
                description: `I rate **${thing}** a **${rating}/10**\n\`${bar}\` ${emoji}`
            })]
        });
    }
};
