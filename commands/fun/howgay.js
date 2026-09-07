const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'howgay', description: 'How gay are you?', usage: ',howgay [@user]' },
    aliases: ['gayrate'],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const percent = Math.floor(Math.random() * 101);
        const bar = '🏳️‍🌈'.repeat(Math.round(percent / 10)) + '⬛'.repeat(10 - Math.round(percent / 10));
        return message.reply({ embeds: [createEmbed({ color: 0xff6b81, title: 'Gay Rate', description: `**${target.username}** is **${percent}%** gay\n\`${bar}\`` })] });
    }
};
