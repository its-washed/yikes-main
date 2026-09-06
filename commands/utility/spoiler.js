const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'spoiler',
        description: 'Send spoiler text',
        usage: ',spoiler [text]'
    },
    aliases: ['sp'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,spoiler [text]')] });

        return message.reply({ content: `||${text}||` });
    }
};
