const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'card',
        description: 'Draw a random playing card',
        usage: ',card'
    },
    aliases: ['draw'],
    cooldown: 3,

    async execute(message) {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        const suit = suits[Math.floor(Math.random() * suits.length)];
        const value = values[Math.floor(Math.random() * values.length)];

        const isRed = suit === '♥️' || suit === '♦️';

        return message.reply({
            embeds: [createEmbed({
                color: isRed ? 0xff4757 : 0x2f3542,
                title: `${suit} ${value} ${suit}`,
                description: `You drew the **${value} of ${suit === '♠️' ? 'Spades' : suit === '♥️' ? 'Hearts' : suit === '♦️' ? 'Diamonds' : 'Clubs'}**`
            })]
        });
    }
};
