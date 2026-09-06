const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'google',
        description: 'Search Google',
        usage: ',google [query]'
    },
    aliases: ['g', 'search'],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ');
        if (!query) {
            return message.reply({ embeds: [errorEmbed('Missing Query', 'Usage: ,google [search query]')] });
        }

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        return message.reply({
            embeds: [createEmbed({
                color: 0x4285f4,
                title: `Google — ${query}`,
                description: `[Click here to search](${searchUrl})`,
                fields: [
                    { name: 'Quick Links', value: `[Google](${searchUrl}) | [YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(query)}) | [Wikipedia](https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)})` }
                ]
            })]
        });
    }
};
