const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roulette', description: 'Play roulette', usage: ',roulette [red/black/green] [amount]' },
    aliases: ['roul'],
    cooldown: 10,
    async execute(message, args) {
        const bet = (args[0] || '').toLowerCase();
        if (!['red', 'black', 'green'].includes(bet)) return message.reply({ embeds: [errorEmbed('Invalid Bet', 'Usage: ,roulette [red/black/green]')] });

        const num = Math.floor(Math.random() * 37);
        const isGreen = num === 0;
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num);
        const color = isGreen ? 'green' : isRed ? 'red' : 'black';
        const emoji = isGreen ? '🟢' : isRed ? '🔴' : '⚫';

        const won = bet === color;
        return message.reply({ embeds: [createEmbed({ color: won ? 0x00d26a : 0xff4757, title: 'Roulette', description: `Ball lands on **${emoji} ${num} (${color})**\n\nYou bet **${bet}** — **${won ? 'You win!' : 'You lose!'}**` })] });
    }
};
