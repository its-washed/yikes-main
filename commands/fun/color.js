const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'color', description: 'Show a color preview', usage: ',color <hex|name>' },
    aliases: ['colour'],
    cooldown: 3,
    async execute(message, args) {
        const input = args[0] || '#6c5ce7';
        const hex = input.replace('#', '');
        const color = parseInt(hex, 16);
        if (isNaN(color)) return message.reply({ embeds: [{ color: 0xff4757, description: 'Invalid hex color.' }] });

        return message.reply({
            embeds: [createEmbed({
                color: color,
                title: `Color: #${hex}`,
                fields: [
                    { name: 'HEX', value: `\`#${hex}\``, inline: true },
                    { name: 'RGB', value: `\`${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}\``, inline: true }
                ],
                thumbnail: { url: `https://singlecolorimage.com/get/${hex}/200x200` }
            })]
        });
    }
};
