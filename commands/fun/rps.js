const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'rps',
        description: 'Rock Paper Scissors',
        usage: ',rps [rock/paper/scissors]'
    },
    aliases: ['rockpaperscissors'],
    cooldown: 3,

    async execute(message, args) {
        const choices = ['rock', 'paper', 'scissors'];
        const player = args[0]?.toLowerCase();

        if (!player || !choices.includes(player)) {
            return message.reply({ embeds: [errorEmbed('Invalid Choice', 'Usage: ,rps [rock/paper/scissors]')] });
        }

        const bot = choices[Math.floor(Math.random() * 3)];
        let result = 'Draw!';

        if (player === bot) result = 'Draw!';
        else if ((player === 'rock' && bot === 'scissors') || (player === 'paper' && bot === 'rock') || (player === 'scissors' && bot === 'paper')) {
            result = 'You win!';
        } else {
            result = 'You lose!';
        }

        return message.reply({
            embeds: [createEmbed({
                color: result === 'You win!' ? 0x00d26a : result === 'You lose!' ? 0xff4757 : 0xfbbf24,
                title: 'Rock Paper Scissors',
                description: `You: **${player}**\nBot: **${bot}**\n\n**${result}**`
            })]
        });
    }
};
