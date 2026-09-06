const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'discover', description: 'Discover servers', usage: ',discover' },
    aliases: ['searchservers'],
    cooldown: 10,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Discover Servers', description: '[Explore Discord servers](https://discord.com/servers)\n\n*Server discovery API requires partnership.*' })] });
    }
};
