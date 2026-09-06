const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'toxic', description: 'Toxic check', usage: ',toxic [@user]' },
    aliases: ['toxicity'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Toxic Check', description: `${user} is **${rate}%** toxic.` })] });
    }
};
