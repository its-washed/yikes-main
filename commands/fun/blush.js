const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'blush', description: 'Blush', usage: ',blush' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Blush!', description: `${message.author} blushes! 😊` })] });
    }
};
