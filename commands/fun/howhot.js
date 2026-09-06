const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'howhot', description: 'Rate hotness', usage: ',howhot [@user]' },
    aliases: ['hot', 'hotness'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Hotness Rating', description: `${user} is **${rate}%** hot.` })] });
    }
};
