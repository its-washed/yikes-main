const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverbanner', description: 'Get server banner', usage: ',serverbanner' },
    aliases: ['sbanner'],
    cooldown: 3,
    async execute(message) {
        const banner = message.guild.bannerURL({ size: 1024 });
        if (!banner) return message.reply({ embeds: [errorEmbed('No Banner', 'This server has no banner.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${message.guild.name} Banner`, image: { url: banner } })] });
    }
};
