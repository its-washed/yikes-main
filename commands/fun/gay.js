const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'gay', description: "Gay rate yourself or a given member", usage: ',gay its_washed', params: ['[user]'] },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
        return message.reply({ embeds: [createEmbed({ color: 0x729bb0, title: 'Gay Rate', description: `${user} is **${rate}%** gay\n\n\`${bar}\`` })] });
    }
};
