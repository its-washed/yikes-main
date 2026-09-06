const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'lyrics',
        description: 'Search for song lyrics',
        usage: ',lyrics [song name]'
    },
    aliases: ['lyric'],
    cooldown: 5,

    async execute(message, args) {
        const song = args.join(' ');
        if (!song) return message.reply({ embeds: [errorEmbed('Missing Song', 'Usage: ,lyrics [song name]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Lyrics — ${song}`,
                description: `[Search lyrics for "${song}"](https://www.azlyrics.com/lyrics/${encodeURIComponent(song.replace(/\s+/g, '').toLowerCase())}.html)\n\n*API not connected.*`
            })]
        });
    }
};
