const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'weather',
        description: 'Get weather info for a location',
        usage: ',weather [location]'
    },
    aliases: ['w'],
    cooldown: 5,

    async execute(message, args) {
        const location = args.join(' ');
        if (!location) {
            return message.reply({ embeds: [errorEmbed('Missing Location', 'Usage: ,weather [city name]')] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x74b9ff,
                title: `Weather — ${location}`,
                description: '*Weather API not connected.*\n\nTo enable, integrate with OpenWeatherMap or similar API.\n\n*Note: This is a placeholder command.*'
            })]
        });
    }
};
