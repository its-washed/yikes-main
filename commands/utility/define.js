const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'define',
        description: 'Define a word',
        usage: ',define [word]'
    },
    aliases: ['dict', 'definition'],
    cooldown: 5,

    async execute(message, args) {
        const word = args[0];
        if (!word) {
            return message.reply({ embeds: [errorEmbed('Missing Word', 'Usage: ,define [word]')] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Definition — ${word}`,
                description: '*Dictionary API not connected.*\n\nTo enable, integrate with Merriam-Webster or Oxford API.\n\n*Note: This is a placeholder command.*'
            })]
        });
    }
};
