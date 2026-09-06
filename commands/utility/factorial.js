const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'factorial', description: 'Calculate factorial', usage: ',factorial [number]' },
    aliases: ['fact'],
    cooldown: 3,
    async execute(message, args) {
        const num = parseInt(args[0]);
        if (isNaN(num) || num < 0) return message.reply({ embeds: [errorEmbed('Invalid Number', 'Provide a non-negative integer.')] });
        if (num > 170) return message.reply({ embeds: [errorEmbed('Too Large', 'Max is 170.')] });
        let result = 1n;
        for (let i = 2n; i <= BigInt(num); i++) result *= i;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Factorial', description: `${num}! = **${result.toString()}**` })] });
    }
};
