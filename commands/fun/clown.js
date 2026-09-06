const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'clown', description: 'Clown check', usage: ',clown [@user]' },
    aliases: ['clowncheck'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: '🤡 Clown Check', description: `${user} is **100%** a clown.` })] });
    }
};
