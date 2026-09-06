const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'laugh', description: 'Laugh', usage: ',laugh' },
    aliases: ['lol'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Laugh!', description: `${message.author} laughs! 😂` })] });
    }
};
