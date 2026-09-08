const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'duel', description: 'Duel another user for money', usage: ',duel [@user] [bet]' },
    aliases: ['fight'],
    cooldown: 30,
    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,duel [@user] [bet]')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot duel yourself.')] });
        if (target.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot duel bots.')] });

        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,duel [@user] [bet]')] });

        const challenger = getUser(message.author.id);
        const opponent = getUser(target.id);

        if (challenger.wallet < bet) return message.reply({ embeds: [errorEmbed('Not Enough', `You need **$${bet.toLocaleString()}** in your wallet.`)] });
        if (opponent.wallet < bet) return message.reply({ embeds: [errorEmbed('Opponent Broke', `${target.tag} doesn't have **$${bet.toLocaleString()}** in their wallet.`)] });

        const challengerPower = Math.floor(Math.random() * 100) + 1;
        const opponentPower = Math.floor(Math.random() * 100) + 1;

        if (challengerPower > opponentPower) {
            updateWallet(message.author.id, bet);
            updateWallet(target.id, -bet);
            return message.reply({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: 'Duel Won!',
                    description: `**${message.author.tag}** vs **${target.tag}**\n\n**${message.author.tag}** wins with power **${challengerPower}** vs **${opponentPower}**!\n\nWon: **$${bet.toLocaleString()}**`
                })]
            });
        } else if (opponentPower > challengerPower) {
            updateWallet(message.author.id, -bet);
            updateWallet(target.id, bet);
            return message.reply({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: 'Duel Lost!',
                    description: `**${message.author.tag}** vs **${target.tag}**\n\n**${target.tag}** wins with power **${opponentPower}** vs **${challengerPower}**!\n\nLost: **$${bet.toLocaleString()}**`
                })]
            });
        } else {
            return message.reply({
                embeds: [createEmbed({
                    color: 0xfbbf24,
                    title: 'Duel Tie!',
                    description: `**${message.author.tag}** vs **${target.tag}**\n\nBoth fighters rolled **${challengerPower}**! No money exchanged.`
                })]
            });
        }
    }
};
