const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'rps',
        description: 'Play rock-paper-scissors',
        usage: ',rps [rock|paper|scissors]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const choices = ['rock', 'paper', 'scissors'];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

        const playerChoice = args[0]?.toLowerCase();
        if (!playerChoice || !choices.includes(playerChoice)) {
            return message.reply({ embeds: [errorEmbed('Invalid Choice', 'Choose rock, paper, or scissors.')] });
        }

        const botChoice = choices[Math.floor(Math.random() * 3)];

        let result;
        if (playerChoice === botChoice) {
            result = "It's a tie!";
        } else if (
            (playerChoice === 'rock' && botChoice === 'scissors') ||
            (playerChoice === 'paper' && botChoice === 'rock') ||
            (playerChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = 'You win!';
        } else {
            result = 'I win!';
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Rock Paper Scissors',
                fields: [
                    { name: 'You', value: `${emojis[playerChoice]} ${playerChoice}`, inline: true },
                    { name: 'Bot', value: `${emojis[botChoice]} ${botChoice}`, inline: true },
                    { name: 'Result', value: `**${result}**`, inline: false }
                ]
            })]
        });
    }
};
