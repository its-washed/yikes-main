const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'convert', description: 'Unit conversion', usage: ',convert [value] [from] [to]' },
    aliases: ['unit'],
    cooldown: 5,
    async execute(message, args) {
        if (args.length < 3) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,convert [value] [from] [to]\nExample: ,convert 100 km miles')] });
        const value = parseFloat(args[0]);
        const from = args[1].toLowerCase();
        const to = args[2].toLowerCase();
        if (isNaN(value)) return message.reply({ embeds: [errorEmbed('Invalid Number', 'Provide a valid number.')] });

        const conversions = {
            'km-miles': 0.621371, 'miles-km': 1.60934,
            'kg-lbs': 2.20462, 'lbs-kg': 0.453592,
            'cm-inches': 0.393701, 'inches-cm': 2.54,
            'm-feet': 3.28084, 'feet-m': 0.3048,
            'l-gallons': 0.264172, 'gallons-l': 3.78541,
            'c-f': null, 'f-c': null
        };

        const key = `${from}-${to}`;
        if (key === 'c-f') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°C = **${(value * 9/5 + 32).toFixed(2)}°F**` })] });
        if (key === 'f-c') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°F = **${((value - 32) * 5/9).toFixed(2)}°C**` })] });

        if (conversions[key]) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value} ${from} = **${(value * conversions[key]).toFixed(2)} ${to}**` })] });
        }

        return message.reply({ embeds: [errorEmbed('Unknown Conversion', 'Supported: km/miles, kg/lbs, cm/inches, m/feet, l/gallons, c/f')] });
    }
};
