const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverSplash', description: 'Get server splash', usage: ',serversplash' },
    aliases: ['splash'],
    cooldown: 3,
    async execute(message) {
        const splash = message.guild.splashURL({ size: 1024 });
        if (!splash) return message.reply({ embeds: [errorEmbed('No Splash', 'This server has no splash.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${message.guild.name} Splash`, image: { url: splash } })] });
    }
};
