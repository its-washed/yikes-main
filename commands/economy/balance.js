const { createEmbed } = require('../../utils/embeds');
const { getUser } = require('../../utils/economy');

module.exports = {
    data: { name: 'balance', description: "Check your balance or another user's", usage: ',balance [@user]' },
    aliases: ['bal', 'money'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const user = getUser(target.id);
        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: `${target.tag}'s Balance`,
                fields: [
                    { name: 'Wallet', value: `$${user.wallet.toLocaleString()}`, inline: true },
                    { name: 'Bank', value: `$${user.bank.toLocaleString()}`, inline: true },
                    { name: 'Total', value: `$${(user.wallet + user.bank).toLocaleString()}`, inline: true }
                ]
            })]
        });
    }
};
