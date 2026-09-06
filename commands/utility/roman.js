const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'roman',
        description: 'Convert to/from Roman numerals',
        usage: ',roman [number]'
    },
    aliases: ['romannumeral'],
    cooldown: 3,

    async execute(message, args) {
        const input = args[0];
        if (!input) return message.reply({ embeds: [errorEmbed('Missing Number', 'Usage: ,roman [number]')] });

        if (/^\d+$/.test(input)) {
            const num = parseInt(input);
            if (num < 1 || num > 3999) return message.reply({ embeds: [errorEmbed('Out of Range', 'Number must be between 1 and 3999.')] });
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Roman Numeral', description: `${num} = **${toRoman(num)}**` })] });
        }

        try {
            const num = fromRoman(input.toUpperCase());
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Decimal', description: `${input.toUpperCase()} = **${num}**` })] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Invalid Input', 'Provide a number (1-3999) or Roman numeral.')] });
        }
    }
};

function toRoman(num) {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
        while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
    }
    return result;
}

function fromRoman(str) {
    const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const curr = map[str[i]];
        const next = map[str[i + 1]];
        if (next && curr < next) { result -= curr; } else { result += curr; }
    }
    return result;
}
