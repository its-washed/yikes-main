const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'highfive', description: 'High five someone', usage: ',highfive [@user]' },
    aliases: ['hf'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,highfive [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'High Five!', description: `${message.author} high fives ${target}! 🖐️` })] });
    }
};
