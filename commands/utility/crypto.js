const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'crypto',
        description: 'Get cryptocurrency price',
        usage: ',crypto [coin]'
    },
    aliases: ['coin', 'price'],
    cooldown: 10,

    async execute(message, args) {
        const coin = (args[0] || 'bitcoin').toLowerCase();

        const prices = {
            bitcoin: { symbol: 'BTC', price: '67,432.18', change: '+2.4%' },
            ethereum: { symbol: 'ETH', price: '3,521.45', change: '+1.8%' },
            solana: { symbol: 'SOL', price: '178.92', change: '-0.5%' },
            dogecoin: { symbol: 'DOGE', price: '0.1523', change: '+5.2%' },
            ripple: { symbol: 'XRP', price: '0.6234', change: '+0.3%' },
            cardano: { symbol: 'ADA', price: '0.4821', change: '-1.2%' },
            polkadot: { symbol: 'DOT', price: '7.89', change: '+3.1%' }
        };

        const data = prices[coin] || { symbol: coin.toUpperCase(), price: 'N/A', change: 'N/A' };

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `${coin.charAt(0).toUpperCase() + coin.slice(1)} (${data.symbol})`,
                fields: [
                    { name: 'Price', value: `$${data.price}`, inline: true },
                    { name: '24h Change', value: data.change, inline: true }
                ],
                footer: { text: 'Prices are simulated. Connect to CoinGecko API for live data.' }
            })]
        });
    }
};
