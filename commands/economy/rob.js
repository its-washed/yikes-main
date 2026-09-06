const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'rob', description: 'Rob another user', usage: ',rob [@user]' },
    aliases: ['steal'],
    cooldown: 300,
    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,rob [@user]')] });
        if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot rob yourself.')] });
        if (target.bot) return message.reply({ embeds: [errorEmbed('Invalid', 'You cannot rob bots.')] });

        const targetUser = getUser(target.id);
        const robber = getUser(message.author.id);

        if (targetUser.wallet < 50) return message.reply({ embeds: [errorEmbed('Too Poor', 'That user has less than $50 in their wallet.')] });

        const chance = Math.random();
        const stolenPercent = Math.floor(Math.random() * 30) + 10;
        const stolenAmount = Math.floor(targetUser.wallet * (stolenPercent / 100));

        if (chance < 0.4) {
            const fine = Math.floor(robber.wallet * 0.2);
            updateWallet(message.author.id, -fine);
            updateWallet(target.id, 0);

            return message.reply({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: 'Robbery Failed!',
                    description: `You got caught and were fined **$${fine.toLocaleString()}**!`
                })]
            });
        }

        updateWallet(message.author.id, stolenAmount);
        updateWallet(target.id, -stolenAmount);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Robbery Successful!',
                description: `You stole **$${stolenAmount.toLocaleString()}** from ${target}!`
            })]
        });
    }
};
