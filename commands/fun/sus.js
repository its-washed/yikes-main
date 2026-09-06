const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'sus', description: 'Check if someone is sus', usage: ',sus [@user]' },
    aliases: ['sussy'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Sus Check', description: `${user} is **${rate}%** sus.` })] });
    }
};
