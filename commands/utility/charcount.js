const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'charcount',
        description: 'Count characters in text',
        usage: ',charcount [text]'
    },
    aliases: ['cc', 'chars'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,charcount [text]')] });

        const chars = text.length;
        const words = text.split(/\s+/).filter(w => w).length;
        const lines = text.split('\n').length;
        const noSpaces = text.replace(/\s/g, '').length;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Character Count',
                fields: [
                    { name: 'Characters', value: `${chars}`, inline: true },
                    { name: 'No Spaces', value: `${noSpaces}`, inline: true },
                    { name: 'Words', value: `${words}`, inline: true },
                    { name: 'Lines', value: `${lines}`, inline: true }
                ]
            })]
        });
    }
};
