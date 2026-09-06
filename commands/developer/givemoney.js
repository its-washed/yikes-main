const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { getUser, updateWallet, updateBank } = require('../../utils/economy');

module.exports = {
    data: { name: 'givemoney', description: 'Give money to a user (Developer only)', usage: ',givemoney [@user] [amount] [wallet/bank]' },
    aliases: ['gm', 'addbal'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);
        const where = args[2] || 'wallet';

        if (!target || isNaN(amount)) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,givemoney [@user] [amount] [wallet/bank]')] });

        if (where === 'bank') {
            updateBank(target.id, amount);
        } else {
            updateWallet(target.id, amount);
        }

        return message.reply({ embeds: [successEmbed(`Gave **$${amount.toLocaleString()}** to **${target.tag}** (${where}).`)] });
    }
};
