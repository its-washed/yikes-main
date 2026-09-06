const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'f',
        description: 'Pay respects',
        usage: ',f [text]'
    },
    aliases: ['payrespects'],
    cooldown: 5,

    async execute(message, args) {
        const text = args.join(' ') || '';
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'F', description: `${message.author.tag} paid their respects.\n\n${text}` })] });
    }
};
