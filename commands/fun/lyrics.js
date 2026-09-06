const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'lys',
        description: 'Get lyrics for a song',
        usage: ',lys [song name]'
    },
    aliases: ['lyric', 'song'],
    cooldown: 5,

    async execute(message, args) {
        const song = args.join(' ');
        if (!song) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Provide a song name.\nExample: ,lys Bohemian Rhapsody' })] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Lyrics — ${song}`,
                description: '*Lyrics API not connected.*\n\nTo enable, integrate with a lyrics API like Genius or Musixmatch.\n\n*Note: This is a placeholder.*'
            })]
        });
    }
};
