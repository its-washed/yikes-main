const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'simp', description: 'How much of a simp are you?', usage: ',simp [@user]' },
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const percent = Math.floor(Math.random() * 101);
        const bar = '💕'.repeat(Math.round(percent / 10)) + '⬛'.repeat(10 - Math.round(percent / 10));
        return message.reply({ embeds: [createEmbed({ color: 0xff6b81, title: 'Simp Meter', description: `**${target.username}** is **${percent}%** simp\n\`${bar}\`` })] });
    }
};
