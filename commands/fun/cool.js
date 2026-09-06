const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'cool', description: 'Cool check', usage: ',cool [@user]' },
    aliases: ['coolcheck'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Cool Check', description: `${user} is **${rate}%** cool.` })] });
    }
};
