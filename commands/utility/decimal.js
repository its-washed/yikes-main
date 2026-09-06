const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'decimal', description: 'Convert hex to decimal', usage: ',decimal [hex]' },
    aliases: ['todecimal'],
    cooldown: 3,
    async execute(message, args) {
        const hex = args[0];
        if (!hex) return message.reply({ embeds: [errorEmbed('Missing Hex', 'Usage: ,decimal [hex]')] });
        const num = parseInt(hex, 16);
        if (isNaN(num)) return message.reply({ embeds: [errorEmbed('Invalid Hex', 'Provide a valid hex number.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Decimal Conversion', description: `${hex} = **${num}**` })] });
    }
};
