const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'banner', description: 'Get user banner', usage: ',banner [@user]' },
    aliases: ['userbanner'],
    cooldown: 5,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const banner = user.bannerURL({ size: 1024 });
        if (!banner) return message.reply({ embeds: [errorEmbed('No Banner', 'This user has no banner.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${user.tag}'s Banner`, image: { url: banner } })] });
    }
};
