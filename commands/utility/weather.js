const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'weather',
        description: 'Get weather info',
        usage: ',weather [city]'
    },
    aliases: ['forecast'],
    cooldown: 10,

    async execute(message, args) {
        const city = args.join(' ');
        if (!city) return message.reply({ embeds: [errorEmbed('Missing City', 'Usage: ,weather [city]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Weather — ${city}`,
                description: `*[Weather API not connected]*\n\nIntegrate with OpenWeatherMap API for real data.`
            })]
        });
    }
};
