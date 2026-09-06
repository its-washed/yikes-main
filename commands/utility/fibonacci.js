const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'fibonacci', description: 'Show fibonacci sequence', usage: ',fibonacci [count]' },
    aliases: ['fib'],
    cooldown: 3,
    async execute(message, args) {
        const count = parseInt(args[0]) || 10;
        if (count < 1 || count > 50) return message.reply({ embeds: [errorEmbed('Invalid Count', 'Must be 1-50.')] });
        const seq = [0, 1];
        for (let i = 2; i < count; i++) seq.push(seq[i-1] + seq[i-2]);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Fibonacci', description: seq.slice(0, count).join(', ') })] });
    }
};
