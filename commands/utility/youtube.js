const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'youtube',
        description: 'YouTube search',
        usage: ',youtube [query]'
    },
    aliases: ['yt'],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [errorEmbed('Missing Query', 'Usage: ,youtube [query]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xff0000,
                title: 'YouTube Search',
                description: `[Search for "${query}"](https://www.youtube.com/results?search_query=${encodeURIComponent(query)})`
            })]
        });
    }
};
