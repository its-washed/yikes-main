const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { getUser, updateBank, updateWallet } = require('../../utils/economy');

module.exports = {
    data: { name: 'interest', description: 'Collect bank interest (2% of bank balance)', usage: ',interest' },
    aliases: ['collectinterest'],
    cooldown: 3600,
    async execute(message) {
        const user = getUser(message.author.id);

        if (user.bank <= 0) {
            return message.reply({ embeds: [errorEmbed('No Funds', 'You have no money in your bank to earn interest on.')] });
        }

        const interest = Math.floor(user.bank * 0.02);
        if (interest <= 0) {
            return message.reply({ embeds: [errorEmbed('Too Low', 'Your bank balance is too low to earn interest.')] });
        }

        updateBank(message.author.id, interest);

        return message.reply({
            embeds: [createEmbed({
                color: 0x22c55e,
                title: 'Interest Collected',
                description: `You earned **$${interest.toLocaleString()}** in interest on your bank balance of **$${user.bank.toLocaleString()}**.\n\nNew balance: **$${(user.bank + interest).toLocaleString()}**`
            })]
        });
    }
};
