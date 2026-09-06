const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'uno', description: 'Reverse card', usage: ',uno [@user]' },
    aliases: ['reversecard'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ content: '🃏 *Draws a reverse card*' });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'UNO Reverse!', description: `${message.author} plays a reverse card on ${target}! 🃏` })] });
    }
};
