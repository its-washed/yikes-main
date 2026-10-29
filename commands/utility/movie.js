const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { getJson } = require('../../utils/social');
const { Paginator } = require('../../utils/pagination');

const OMDB_KEY = process.env.OMDB_API_KEY || process.env.OMDB || '';

module.exports = {
    data: { name: 'movie', description: 'Get information about a movie', usage: ',movie The Matrix', params: ['query'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const search = args.join(' ').trim();
        if (!search) return warn(message, 'You must provide a search query\n> Usage: `,movie The Matrix`');
        if (!OMDB_KEY) return warn(message, 'The movie API key is not configured');

        const searchData = await getJson(`https://www.omdbapi.com/?s=${encodeURIComponent(search)}&apikey=${OMDB_KEY}`);
        if (!searchData || searchData.Response === 'False') return warn(message, `No results found for **${search}**`);

        const results = (searchData.Search || []).slice(0, 10);
        const embeds = [];
        for (const result of results) {
            const detail = await getJson(`https://www.omdbapi.com/?i=${encodeURIComponent(result.imdbID)}&apikey=${OMDB_KEY}`);
            if (!detail || detail.Response === 'False') continue;
            embeds.push({
                color: COLORS.NEUTRAL,
                title: `${detail.Title} (${detail.Year})`,
                fields: [
                    { name: 'Rating', value: detail.imdbRating || 'N/A', inline: true },
                    { name: 'Genre', value: detail.Genre || 'N/A', inline: true },
                    { name: 'Language', value: detail.Language || 'N/A', inline: true },
                    { name: 'Director', value: detail.Director || 'N/A', inline: true },
                    { name: 'Writer', value: detail.Writer || 'N/A', inline: true },
                    { name: 'Actors', value: detail.Actors || 'N/A', inline: true },
                    { name: 'Plot', value: detail.Plot || 'N/A', inline: false }
                ],
                thumbnail: detail.Poster && detail.Poster !== 'N/A' ? { url: detail.Poster } : undefined,
                footer: { text: `Page: ${embeds.length + 1}/${results.length} (${results.length} entries)` }
            });
        }
        if (!embeds.length) return warn(message, `No results found for **${search}**`);
        if (embeds.length > 1) {
            const paginator = new Paginator(embeds, { userId: message.author.id });
            const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
            await paginator.start(message.channel, sent);
            return sent;
        }
        return message.reply({ embeds });
    }
};
