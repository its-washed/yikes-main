const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

const ROULETTE_NUMBERS = {
    red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
    black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
    green: [0]
};

module.exports = {
    data: { name: 'roulette', description: 'Play roulette', usage: ',roulette [bet type] [amount]' },
    aliases: ['roul'],
    cooldown: 5,
    async execute(message, args) {
        const betType = (args[0] || '').toLowerCase();
        const bet = parseInt(args[1]);
        const user = getUser(message.author.id);

        if (!['red', 'black', 'green', 'even', 'odd'].includes(betType)) {
            return message.reply({ embeds: [errorEmbed('Invalid Bet Type', 'Usage: ,roulette [red/black/green/even/odd] [amount]')] });
        }
        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,roulette [type] [amount]')] });
        if (bet > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        const rolled = Math.floor(Math.random() * 37);
        const isRed = ROULETTE_NUMBERS.red.includes(rolled);
        const isBlack = ROULETTE_NUMBERS.black.includes(rolled);
        const isGreen = ROULETTE_NUMBERS.green.includes(rolled);
        const isEven = rolled % 2 === 0 && rolled !== 0;
        const isOdd = rolled % 2 !== 0;

        let won = false;
        let multiplier = 0;

        if (betType === 'red' && isRed) { won = true; multiplier = 2; }
        else if (betType === 'black' && isBlack) { won = true; multiplier = 2; }
        else if (betType === 'green' && isGreen) { won = true; multiplier = 14; }
        else if (betType === 'even' && isEven) { won = true; multiplier = 2; }
        else if (betType === 'odd' && isOdd) { won = true; multiplier = 2; }

        const winnings = won ? bet * multiplier : 0;
        updateWallet(message.author.id, won ? winnings - bet : -bet);

        const colorName = isGreen ? 'green' : isRed ? 'red' : 'black';
        const colorEmoji = isGreen ? '🟢' : isRed ? '🔴' : '⚫';

        return message.reply({
            embeds: [createEmbed({
                color: won ? 0x22c55e : 0xff4757,
                title: 'Roulette',
                description: `The wheel lands on **${rolled}** ${colorEmoji}\n\n**${won ? `You won $${winnings.toLocaleString()}!` : 'You lost!'}**`,
                fields: [
                    { name: 'Bet', value: `${betType} — $${bet.toLocaleString()}`, inline: true },
                    { name: 'Result', value: `${colorName} ${rolled}`, inline: true },
                    { name: 'Balance', value: `$${(user.wallet - bet + winnings).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
