const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'slots', description: 'Play the slot machine', usage: ',slots [bet]' },
    aliases: ['slot', 'spin'],
    cooldown: 5,
    async execute(message, args) {
        const user = getUser(message.author.id);
        const bet = parseInt(args[0]);

        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,slots [bet]')] });
        if (bet > user.wallet) return message.reply({ embeds: [errorEmbed('Not Enough', `You only have **$${user.wallet.toLocaleString()}** in your wallet.`)] });

        const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '💎', '7️⃣'];
        const s1 = symbols[Math.floor(Math.random() * symbols.length)];
        const s2 = symbols[Math.floor(Math.random() * symbols.length)];
        const s3 = symbols[Math.floor(Math.random() * symbols.length)];

        let multiplier = 0;
        let result = '';

        if (s1 === s2 && s2 === s3) {
            if (s1 === '💎') { multiplier = 10; result = 'THREE DIAMONDS!'; }
            else if (s1 === '7️⃣') { multiplier = 7; result = 'JACKPOT!'; }
            else { multiplier = 5; result = 'TRIPLE MATCH!'; }
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            multiplier = 2;
            result = 'Double Match!';
        } else {
            multiplier = 0;
            result = 'No match.';
        }

        const winnings = Math.floor(bet * multiplier);
        updateWallet(message.author.id, winnings - bet);

        return message.reply({
            embeds: [createEmbed({
                color: winnings > bet ? 0x22c55e : 0xff4757,
                title: 'Slot Machine',
                description: `**[ ${s1} | ${s2} | ${s3} ]**\n\n${result}\n${winnings > bet ? `You won **$${winnings.toLocaleString()}**!` : `You lost **$${bet.toLocaleString()}**.`}`,
                fields: [
                    { name: 'Bet', value: `$${bet.toLocaleString()}`, inline: true },
                    { name: 'Winnings', value: `$${winnings.toLocaleString()}`, inline: true },
                    { name: 'Balance', value: `$${(user.wallet - bet + winnings).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
