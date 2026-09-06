const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'gay', description: 'Gay rate', usage: ',gay [@user]' },
    aliases: ['gayrate'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Gay Rate', description: `${user} is **${rate}%** gay\n\n\`${bar}\`` })] });
    }
};
