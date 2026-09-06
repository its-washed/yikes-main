const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'stupid', description: 'Stupid check', usage: ',stupid [@user]' },
    aliases: ['stupidcheck'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Stupid Check', description: `${user} is **${rate}%** stupid.` })] });
    }
};
