const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'boobs', description: 'How big are they?', usage: ',boobs [@user]' },
    aliases: ['size'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const size = Math.floor(Math.random() * 11);
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Size Check', description: `${user} has a size of **${size}**.` })] });
    }
};
