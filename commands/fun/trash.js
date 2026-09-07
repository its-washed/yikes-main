const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'trash', description: 'Rate how trash someone is', usage: ',trash [@user]' },
    aliases: ['trasher'],
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const percent = Math.floor(Math.random() * 101);
        const bar = '🗑️'.repeat(Math.round(percent / 10)) + '⬛'.repeat(10 - Math.round(percent / 10));
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Trash Rate', description: `**${target.username}** is **${percent}%** trash\n\`${bar}\`` })] });
    }
};
