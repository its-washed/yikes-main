const { warn } = require('../../utils/context');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: { name: 'crypto', description: "Convert cryptocurrency to a specified currency", usage: ',crypto 125 eur ltc', params: ['amount', 'from', 'to'] },
    aliases: ['convert', 'conv'],
    cooldown: 5,

    async execute(message, args) {
        const amount = parseFloat(args[0]);
        const fromCurrency = args[1];
        const toCurrency = args[2];

        if (isNaN(amount) || !fromCurrency || !toCurrency) {
            return warn(message, 'Usage: `crypto 125 eur ltc`');
        }

        let data;
        try {
            const res = await fetch(`https://api.evelina.bot/crypto?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
            data = await res.json();
        } catch (err) {
            return warn(message, 'An error occurred while retrieving conversion data.');
        }

        if (!data || data.status !== 'success') {
            return warn(message, 'Failed to retrieve conversion data. Please check the currency codes.');
        }

        const amountFrom = data[fromCurrency.toUpperCase()] ?? 'N/A';
        const amountTo = data[toCurrency.toUpperCase()] ?? 'N/A';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`crypto_copy:${amountTo}`)
                .setLabel('Copy Amount')
                .setStyle(ButtonStyle.Primary)
        );

        return message.reply({
            embeds: [{
                color: COLORS.EXCHANGE,
                description: `${EMOJIS.EXCHANGE} ${message.author}: ${amountFrom} **${fromCurrency.toUpperCase()}** is ${amountTo} **${toCurrency.toUpperCase()}**`
            }],
            components: [row]
        });
    }
};
