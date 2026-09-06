const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'owo',
        description: 'OwO-ify text',
        usage: ',owo [text]'
    },
    aliases: ['owoify'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,owo [text]')] });

        const owo = text
            .replace(/[rl]/g, 'w')
            .replace(/[RL]/g, 'W')
            .replace(/n([aeiou])/g, 'ny$1')
            .replace(/N([aeiou])/g, 'Ny$1')
            .replace(/N([AEIOU])/g, 'NY$1')
            .replace(/ove/g, 'uv')
            .replace(/!+/g, ' !uwu!')
            .replace(/\?+/g, ' ? owo?');

        return message.reply({ content: owo });
    }
};
