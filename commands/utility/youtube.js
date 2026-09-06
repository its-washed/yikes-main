const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'youtube',
        description: 'Search YouTube',
        usage: ',youtube [query]'
    },
    aliases: ['yt'],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ');
        if (!query) {
            return message.reply({ embeds: [errorEmbed('Missing Query', 'Usage: ,youtube [search query]')] });
        }

        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

        return message.reply({
            embeds: [createEmbed({
                color: 0xff0000,
                title: `YouTube — ${query}`,
                description: `[Click here to search](${url})`
            })]
        });
    }
};
