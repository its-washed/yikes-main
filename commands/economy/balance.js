const { createEmbed } = require('../../utils/embeds');
const { getUser } = require('../../utils/economy');

module.exports = {
    data: { name: 'balance', description: 'Check your balance', usage: ',balance' },
    aliases: ['bal', 'money'],
    cooldown: 5,
    async execute(message) {
        const user = getUser(message.author.id);
        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: `${message.author.tag}'s Balance`,
                fields: [
                    { name: 'Wallet', value: `$${user.wallet.toLocaleString()}`, inline: true },
                    { name: 'Bank', value: `$${user.bank.toLocaleString()}`, inline: true },
                    { name: 'Total', value: `$${(user.wallet + user.bank).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
