const { warn } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');
const { getJson } = require('../../utils/social');

const EVELINA_KEY = 'X3pZmLq82VnHYTd6Cr9eAw';

module.exports = {
    data: { name: 'spotify_old', description: 'Get information about spotify', usage: ',spotify_old <track>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['track'],
    subUsages: { track: ',spotify_old track yeat' },
    execute: async (message) => sendCard(message, module.exports),

    subs: {
        track: {
            aliases: ['tr'],
            data: { name: 'spotify_old track', description: 'Search for a track on spotify', usage: ',spotify_old track yeat' },
            execute: async (message, args) => {
                const query = args.join(' ').trim();
                if (!query) return warn(message, 'You must provide a search query\n> Usage: `,spotify_old track yeat`');
                const data = await getJson(`https://api.evelina.bot/spotify/track?q=${encodeURIComponent(query)}&key=${EVELINA_KEY}`);
                if (!data || 'message' in data) return warn(message, `Couldn't get information about **${query}**`);
                const trackName = (data.track && data.track.name) || 'Unknown Track';
                const trackUrl = (data.track && data.track.url) || '#';
                const artistName = (data.artist && data.artist.name) || 'Unknown Artist';
                const artistUrl = (data.artist && data.artist.url) || '#';
                const albumName = (data.album && data.album.name) || 'Unknown Album';
                const albumUrl = (data.album && data.album.url) || '#';
                return message.reply({
                    embeds: [{
                        color: 0x1ED760,
                        description: `${EMOJIS.SPOTIFY} [**${trackName}**](${trackUrl}) by [**${artistName}**](${artistUrl}) on [**${albumName}**](${albumUrl})`
                    }]
                });
            }
        }
    }
};
