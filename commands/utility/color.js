const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'color',
        description: "Show a hex codes color in a embed",
        usage: ',color #hexcolor', params: ['color']
    },
    aliases: ['colour'],
    cooldown: 3,

    async execute(message, args) {
        const hex = (args[0] || '#6c5ce7').replace('#', '');
        const color = parseInt(hex, 16);

        if (isNaN(color) || color > 0xFFFFFF) {
            return message.reply({ embeds: [createEmbed({ color: 0xff3939, description: 'Invalid hex color.' })] });
        }

        const hexCode = `#${hex.toUpperCase()}`;

        return message.reply({
            embeds: [createEmbed({
                color: color,
                author: { name: `Showing hex code: ${hexCode}` },
                title: hexCode,
                fields: [
                    { name: 'RGB Value', value: `${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}`, inline: true },
                    { name: 'INT', value: `${color}`, inline: true }
                ],
                thumbnail: { url: `https://place-hold.it/250x219/${hex}?text=%20` }
            })]
        });
    }
};
