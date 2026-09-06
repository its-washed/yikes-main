const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'worship', description: 'Worship someone', usage: ',worship [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Worship!', description: `${message.author} worships ${target}! 🙇` })] });
    }
};
