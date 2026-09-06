const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'uwuify',
        description: 'UwU-ify text',
        usage: ',uwuify [text]'
    },
    aliases: ['uwu'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,uwuify [text]')] });

        const uwu = text
            .replace(/[rl]/g, 'w')
            .replace(/[RL]/g, 'W')
            .replace(/n([aeiou])/g, 'ny$1')
            .replace(/N([aeiou])/g, 'Ny$1')
            .replace(/N([AEIOU])/g, 'NY$1')
            .replace(/ove/g, 'uv')
            .replace(/!+/g, ' !uwu!')
            .replace(/\?+/g, ' ? owo?')
            .replace(/\.+$/g, ' uwu~');

        return message.reply({ content: uwu });
    }
};
