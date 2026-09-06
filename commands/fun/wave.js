const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'wave', description: 'Wave at someone', usage: ',wave [@user]' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Wave!', description: `${message.author} waves at ${target}! 👋` })] });
    }
};
