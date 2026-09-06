const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'point', description: 'Point at someone', usage: ',point [@user]' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Point!', description: `${message.author} points at ${target}! 👉` })] });
    }
};
