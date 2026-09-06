const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'Charcount',
        description: 'Count characters in text',
        usage: ',charcount [text]'
    },
    aliases: ['cc', 'length'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,charcount [text]')] });

        const chars = text.length;
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const lines = text.split('\n').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const spaces = (text.match(/ /g) || []).length;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Text Stats',
                fields: [
                    { name: 'Characters', value: `${chars}`, inline: true },
                    { name: 'Words', value: `${words}`, inline: true },
                    { name: 'Lines', value: `${lines}`, inline: true },
                    { name: 'Sentences', value: `${sentences}`, inline: true },
                    { name: 'Spaces', value: `${spaces}`, inline: true }
                ]
            })]
        });
    }
};
