const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'stickerlist', description: 'List all server stickers', usage: ',stickerlist' },
    aliases: ['sl'],
    cooldown: 5,
    async execute(message) {
        const stickers = message.guild.stickers.cache;
        if (stickers.size === 0) return message.reply({ embeds: [errorEmbed('No Stickers', 'This server has no stickers.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Stickers (${stickers.size})`, description: stickers.map(s => `${s.name}`).join('\n').slice(0, 2000) })] });
    }
};
