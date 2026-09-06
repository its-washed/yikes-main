const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'dice',
        description: 'Roll a dice',
        usage: ',dice [sides]'
    },
    aliases: ['roll'],
    cooldown: 3,

    async execute(message, args) {
        const sides = parseInt(args[0]) || 6;
        const result = Math.floor(Math.random() * sides) + 1;

        return message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Dice Roll', description: `🎲 **${result}** (1-${sides})` })]
        });
    }
};
