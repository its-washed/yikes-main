const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'coinflip', description: 'Flip a coin and gamble', usage: ',coinflip [heads/tails] [bet]' },
    aliases: ['cf', 'flip'],
    cooldown: 5,
    async execute(message, args) {
        const call = args[0];
        const bet = parseInt(args[1]);
        const user = getUser(message.author.id);

        if (!call || !['heads', 'tails', 'h', 't'].includes(call.toLowerCase())) {
            return message.reply({ embeds: [errorEmbed('Invalid Call', 'Usage: ,coinflip [heads/tails] [bet]')] });
        }
        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,coinflip [heads/tails] [bet]')] });
        if (bet > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const normalizedCall = (call === 'h') ? 'heads' : (call === 't') ? 'tails' : call.toLowerCase();
        const won = normalizedCall === result;

        if (won) {
            updateWallet(message.author.id, bet);
        } else {
            updateWallet(message.author.id, -bet);
        }

        const emoji = result === 'heads' ? '🪙' : 'tails';

        return message.reply({
            embeds: [createEmbed({
                color: won ? 0x22c55e : 0xff4757,
                title: 'Coin Flip',
                description: `The coin lands on **${result}**! ${emoji}\n\n**${won ? 'You won!' : 'You lost!'}**`,
                fields: [
                    { name: 'Call', value: normalizedCall, inline: true },
                    { name: 'Bet', value: `$${bet.toLocaleString()}`, inline: true },
                    { name: 'Balance', value: `$${(user.wallet + (won ? bet : -bet)).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
