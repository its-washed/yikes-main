const { warn } = require('../../utils/context');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { rapidHeaders, getJson } = require('../../utils/social');

function shorten(value, length = 50) {
    const text = String(value || '');
    return text.length > length ? text.slice(0, length - 2) + '...' : text;
}

module.exports = {
    data: { name: 'song', description: 'Get information about a song', usage: ',song <artist, title>' },
    aliases: ['music', 'beat', 'songinfo'],
    cooldown: 5,

    async execute(message, args) {
        const title = args.join(' ').trim();
        if (!title) return warn(message, 'You must provide a song\n> Usage: `song <artist, title>`');

        const headers = rapidHeaders();
        if (!headers['X-RapidAPI-Key']) {
            return warn(message, 'Song lookup is not configured (missing RAPIDAPI key).');
        }

        const url = new URL('https://genius-song-lyrics1.p.rapidapi.com/search/');
        url.searchParams.set('q', title);
        url.searchParams.set('per_page', '1');
        url.searchParams.set('page', '1');

        const response = await getJson(url.toString(), headers);
        if (!response || !Array.isArray(response.hits) || !response.hits.length) {
            return warn(message, `No results found for **${title}**`);
        }

        const info = response.hits[0].result;
        const embed = {
            color: COLORS.NEUTRAL,
            title: info.title,
            url: info.url,
            timestamp: Date.now(),
            author: {
                name: message.author.username,
                icon_url: message.author.displayAvatarURL({ size: 256 })
            },
            fields: [
                { name: 'Artists', value: shorten(info.artist_names, 50), inline: false },
                { name: 'Release Date', value: String(info.release_date_for_display || 'Unknown'), inline: true },
                { name: 'Hot', value: info.stats && info.stats.hot ? EMOJIS.APPROVE : EMOJIS.DENY, inline: true },
                { name: 'Instrumental', value: info.instrumental ? EMOJIS.APPROVE : EMOJIS.DENY, inline: true }
            ],
            footer: {
                text: `${Number((info.stats && info.stats.pageviews) || 0).toLocaleString('en-US')} views`
            }
        };
        if (info.song_art_image_url) embed.thumbnail = { url: info.song_art_image_url };
        if (Array.isArray(info.featured_artists) && info.featured_artists.length) {
            embed.fields.push({ name: 'More Artists', value: info.featured_artists.map(row => row.name).join(', ') });
        }
        return message.reply({ embeds: [embed] });
    }
};
