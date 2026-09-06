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

        if (sides < 2 || sides > 100) {
            return message.reply({ embeds: [errorEmbed('Invalid Sides', 'Dice sides must be between 2 and 100.')] });
        }

        const result = Math.floor(Math.random() * sides) + 1;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Dice Roll',
                description: `🎲 You rolled a **${result}** on a d${sides}!`
            })]
        });
    }
};
