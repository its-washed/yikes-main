const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'simprate', description: 'Rate someone\'s simping', usage: ',simprate [@user]' },
    aliases: ['simp'],
    cooldown: 5,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const rate = Math.floor(Math.random() * 101);
        let emoji = '😐';
        if (rate > 75) emoji = '🤓';
        else if (rate > 50) emoji = '😏';
        else if (rate > 25) emoji = '🤨';
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Simp Rate', description: `${user}'s simping level: **${rate}%** ${emoji}` })] });
    }
};
