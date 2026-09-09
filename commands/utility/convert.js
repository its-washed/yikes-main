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
            'mm-inches': 0.0393701, 'inches-mm': 25.4,
            'km-cm': 100000, 'cm-km': 0.00001,
            'km-mm': 1000000, 'mm-km': 0.000001,
            'miles-feet': 5280, 'feet-miles': 0.000189394,
            'yards-meters': 0.9144, 'meters-yards': 1.09361,
            'km-yards': 1093.61, 'yards-km': 0.0009144,
            'miles-yards': 1760, 'yards-miles': 0.000568182,
            'nauticalmiles-km': 1.852, 'km-nauticalmiles': 0.539957,
            'oz-g': 28.3495, 'g-oz': 0.035274,
            'kg-g': 1000, 'g-kg': 0.001,
            'tons-kg': 907.185, 'kg-tons': 0.00110231,
            'tons-lbs': 2000, 'lbs-tons': 0.0005,
            'tonnes-kg': 1000, 'kg-tonnes': 0.001,
            'tonnes-lbs': 2204.62, 'lbs-tonnes': 0.000453592,
            'ml-cups': 0.00422675, 'cups-ml': 236.588,
            'l-ml': 1000, 'ml-l': 0.001,
            'gallons-quarts': 4, 'quarts-gallons': 0.25,
            'gallons-pints': 8, 'pints-gallons': 0.125,
            'cups-l': 0.236588, 'l-cups': 4.22675,
            'cups-oz': 8, 'oz-cups': 0.125,
            'c-f': null, 'f-c': null, 'c-k': null, 'f-k': null, 'k-c': null, 'k-f': null,
            'kmh-mph': 0.621371, 'mph-kmh': 1.60934,
            'ms-kmh': 3.6, 'kmh-ms': 0.277778,
            'ms-mph': 2.23694, 'mph-ms': 0.44704,
            'knots-kmh': 1.852, 'kmh-knots': 0.539957,
            'knots-mph': 1.15078, 'mph-knots': 0.868976,
            'sqm-sqft': 10.7639, 'sqft-sqm': 0.092903,
            'sqkm-sqmi': 0.386102, 'sqmi-sqkm': 2.58999,
            'acres-sqm': 4046.86, 'sqm-acres': 0.000247105,
            'hectares-acres': 2.47105, 'acres-hectares': 0.404686,
            'hectares-sqm': 10000, 'sqm-hectares': 0.0001,
            'acres-sqft': 43560, 'sqft-acres': 0.0000229568,
            'sqyd-sqm': 0.836127, 'sqm-sqyd': 1.19599
        };

        const key = `${from}-${to}`;
        if (key === 'c-f') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°C = **${(value * 9/5 + 32).toFixed(2)}°F**` })] });
        if (key === 'f-c') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°F = **${((value - 32) * 5/9).toFixed(2)}°C**` })] });
        if (key === 'c-k') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°C = **${(value + 273.15).toFixed(2)}K**` })] });
        if (key === 'f-k') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}°F = **${((value - 32) * 5/9 + 273.15).toFixed(2)}K**` })] });
        if (key === 'k-c') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}K = **${(value - 273.15).toFixed(2)}°C**` })] });
        if (key === 'k-f') return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value}K = **${((value - 273.15) * 9/5 + 32).toFixed(2)}°F**` })] });

        if (conversions[key]) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Conversion', description: `${value} ${from} = **${(value * conversions[key]).toFixed(2)} ${to}**` })] });
        }

        return message.reply({ embeds: [errorEmbed('Unknown Conversion', 'Supported:\n• Distance: km/miles/cm/mm/m/feet/yards/nauticalmiles\n• Weight: kg/lbs/oz/g/tons/tonnes\n• Volume: l/ml/gallons/cups/quarts/pints\n• Temperature: c/f/k\n• Speed: kmh/mph/ms/knots\n• Area: sqm/sqft/sqkm/sqmi/acres/hectares/sqyd')] });
    }
};
