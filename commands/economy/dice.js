const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'dice', description: 'Roll dice against the bot', usage: ',dice [bet]' },
    aliases: ['diceroll'],
    cooldown: 5,
    async execute(message, args) {
        const user = getUser(message.author.id);
        const bet = parseInt(args[0]);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,dice [bet]')] });
        if (bet > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const botRoll = Math.floor(Math.random() * 6) + 1;

        let winnings = 0;
        let result = '';

        if (playerRoll > botRoll) {
            winnings = bet;
            result = 'You win!';
        } else if (playerRoll < botRoll) {
            winnings = -bet;
            result = 'Bot wins!';
        } else {
            result = 'Tie! No money lost.';
        }

        if (winnings !== 0) updateWallet(message.author.id, winnings);

        return message.reply({
            embeds: [createEmbed({
                color: winnings > 0 ? 0x22c55e : winnings < 0 ? 0xff4757 : 0xfbbf24,
                title: 'Dice Roll',
                description: `**You:** 🎲 ${playerRoll}\n**Bot:** 🎲 ${botRoll}\n\n**${result}**`,
                fields: [
                    { name: 'Bet', value: `$${bet.toLocaleString()}`, inline: true },
                    { name: 'Winnings', value: `$${(winnings > 0 ? winnings : 0).toLocaleString()}`, inline: true },
                    { name: 'Balance', value: `$${(user.wallet + winnings).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
