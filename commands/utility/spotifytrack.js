const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'spotifytrack', description: 'Search Spotify track', usage: ',spotifytrack [name]' },
    aliases: ['st'],
    cooldown: 10,
    async execute(message, args) {
        const name = args.join(' ');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,spotifytrack [name]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x1db954, title: `Spotify — ${name}`, description: `[Search on Spotify](https://open.spotify.com/search/${encodeURIComponent(name)})\n\n*API not connected.*` })] });
    }
};
