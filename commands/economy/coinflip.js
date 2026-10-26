const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet, parseBet } = require('../../utils/economy');

module.exports = {
    data: { name: 'coinflip', description: 'Flip a coin and gamble', usage: ',coinflip [heads/tails] [bet/all/half/%]' },
    aliases: ['cf', 'flip'],
    cooldown: 5,
    async execute(message, args) {
        const sides = ['heads', 'tails', 'h', 't'];
        const sideIdx = args.findIndex(a => sides.includes(String(a).toLowerCase()));
        const call = sideIdx === -1 ? 'heads' : String(args[sideIdx]).toLowerCase();
        const user = getUser(message.author.id);
        const token = args.find((a, i) => i !== sideIdx && /^(all|half|\d+(?:\.\d+)?%|\d+)$/i.test(String(a)));
        const bet = parseBet(token, user.wallet);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,coinflip [heads/tails] [bet/all/half/%]')] });
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
