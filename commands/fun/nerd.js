const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'nerd', description: 'Nerd check', usage: ',nerd [@user]' },
    aliases: ['nerdcheck'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0x3b82f6, title: 'Nerd Check', description: `${user} is **${rate}%** nerd.` })] });
    }
};
