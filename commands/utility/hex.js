const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'hex', description: 'Convert decimal to hex', usage: ',hex [number]' },
    aliases: ['tohex'],
    cooldown: 3,
    async execute(message, args) {
        const num = parseInt(args[0]);
        if (isNaN(num)) return message.reply({ embeds: [errorEmbed('Missing Number', 'Usage: ,hex [number]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Hex Conversion', description: `${num} = **0x${num.toString(16).toUpperCase()}**` })] });
    }
};
