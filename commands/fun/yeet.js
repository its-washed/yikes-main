const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'yeet', description: 'Yeet someone', usage: ',yeet [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,yeet [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'YEET!', description: `${message.author} yeets ${target}! 🏀` })] });
    }
};
