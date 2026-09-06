const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'google',
        description: 'Google search',
        usage: ',google [query]'
    },
    aliases: ['g', 'search'],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [errorEmbed('Missing Query', 'Usage: ,google [query]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Google Search',
                description: `[Search for "${query}"](https://www.google.com/search?q=${encodeURIComponent(query)})`
            })]
        });
    }
};
