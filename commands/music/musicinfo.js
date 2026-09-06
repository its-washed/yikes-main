const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'musicinfo',
        description: 'Show music system info',
        usage: ',musicinfo'
    },
    aliases: ['mi'],
    cooldown: 5,

    async execute(message, args, client) {
        const server = servers.get(message.guild.id);

        const activeGuilds = servers.size;
        const totalSongs = Array.from(servers.values()).reduce((acc, s) => acc + s.queue.length, 0);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Music System',
                fields: [
                    { name: 'Active Sessions', value: `${activeGuilds}`, inline: true },
                    { name: 'Total Songs Queued', value: `${totalSongs}`, inline: true },
                    { name: 'This Server', value: server ? `${server.queue.length} song(s) in queue` : 'Not playing', inline: true },
                    { name: 'Commands', value: '`play` `queue` `skip` `stop` `shuffle` `volume` `loop` `remove` `bass` `nowplaying`', inline: false },
                    { name: 'Note', value: 'To enable real audio playback, install `ytdl-core` and uncomment the stream code in `play.js`.\nAlternatively, use Lavalink or DisTube for full music support.', inline: false }
                ]
            })]
        });
    }
};
