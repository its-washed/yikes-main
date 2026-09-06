const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'color',
        description: 'Show a color preview',
        usage: ',color #hexcolor'
    },
    aliases: ['colour', 'hex'],
    cooldown: 3,

    async execute(message, args) {
        const hex = (args[0] || '#6c5ce7').replace('#', '');
        const color = parseInt(hex, 16);

        if (isNaN(color) || color > 0xFFFFFF) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Invalid hex color.' })] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: color,
                title: `#${hex.toUpperCase()}`,
                fields: [
                    { name: 'RGB', value: `${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}`, inline: true },
                    { name: 'Integer', value: `${color}`, inline: true }
                ],
                thumbnail: { url: `https://singlecolorimage.com/get/${hex}/200x200` }
            })]
        });
    }
};
