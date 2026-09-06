const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'currency', description: 'Convert currency', usage: ',currency [amount] [from] [to]' },
    aliases: ['money', 'forex'],
    cooldown: 10,
    async execute(message, args) {
        if (args.length < 3) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,currency [amount] [from] [to]\nExample: ,currency 100 USD EUR')] });
        const amount = parseFloat(args[0]);
        const from = args[1].toUpperCase();
        const to = args[2].toUpperCase();
        if (isNaN(amount)) return message.reply({ embeds: [errorEmbed('Invalid Amount', 'Provide a valid number.')] });

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Currency Conversion', description: `*Currency API not connected.*\n\nConnect to exchangerate-api.com for live rates.\n\n${amount} ${from} → ? ${to}` })] });
    }
};
