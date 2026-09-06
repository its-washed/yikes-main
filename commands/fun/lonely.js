const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'lonely', description: 'Check if you\'re lonely', usage: ',lonely' },
    aliases: ['alone'],
    cooldown: 5,
    async execute(message) {
        const lonely = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Loneliness Meter', description: `You are **${lonely}%** lonely.` })] });
    }
};
