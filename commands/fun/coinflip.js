const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'coinflip',
        description: 'Flip a coin',
        usage: ',coinflip'
    },
    aliases: ['flip', 'coin'],
    cooldown: 3,

    async execute(message) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🔵';

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Coin Flip',
                description: `${emoji} **${result}**!`
            })]
        });
    }
};
