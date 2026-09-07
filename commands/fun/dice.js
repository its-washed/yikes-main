const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'dice', description: 'Roll dice', usage: ',dice [sides]' },
    aliases: ['roll'],
    cooldown: 2,
    async execute(message, args) {
        const sides = Math.min(Math.max(parseInt(args[0]) || 6, 2), 100);
        const result = Math.floor(Math.random() * sides) + 1;
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Dice Roll', description: `🎲 **${result}** (d${sides})` })] });
    }
};
