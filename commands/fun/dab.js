const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'dab', description: 'Dab', usage: ',dab' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Dab!', description: `${message.author} dabs! 💃` })] });
    }
};
