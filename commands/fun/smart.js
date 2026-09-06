const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'smartin', description: 'Smart check', usage: ',smart [@user]' },
    aliases: ['smartcheck'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0x3b82f6, title: 'Smart Check', description: `${user} is **${rate}%** smart.` })] });
    }
};
