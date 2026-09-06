const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'clap',
        description: 'CLAP YOUR TEXT',
        usage: ',clap [text]'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,clap [text]')] });
        return message.reply({ content: `👏 ${text.split(' ').join(' 👏 ')} 👏` });
    }
};
