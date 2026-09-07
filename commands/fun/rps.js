const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rps', description: 'Rock Paper Scissors', usage: ',rps <rock|paper|scissors>' },
    cooldown: 3,
    async execute(message, args) {
        const choices = ['rock', 'paper', 'scissors'];
        const user = args[0]?.toLowerCase();
        if (!user || !choices.includes(user)) return message.reply({ embeds: [errorEmbed('Usage', ',rps <rock|paper|scissors>')] });

        const bot = choices[Math.floor(Math.random() * 3)];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        let result;

        if (user === bot) result = 'Tie!';
        else if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) result = 'You win!';
        else result = 'I win!';

        return message.reply({
            embeds: [createEmbed({
                color: result === 'Tie!' ? 0xfbbf24 : result === 'You win!' ? 0x22c55e : 0xff4757,
                title: 'Rock Paper Scissors',
                description: `You: ${emojis[user]} | Bot: ${emojis[bot]}\n\n**${result}**`
            })]
        });
    }
};
