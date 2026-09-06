const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

const servers = new Map();

module.exports = {
    data: {
        name: 'play',
        description: 'Play a song in your voice channel',
        usage: ',play [song name or URL]'
    },
    aliases: ['p'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Song', 'Provide a song name or URL.')] });
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });
        }

        const permissions = voiceChannel.permissionsFor(message.guild.members.me);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return message.reply({ embeds: [errorEmbed('Permissions', 'I need `Connect` and `Speak` permissions.')] });
        }

        const guildId = message.guild.id;

        if (!servers.has(guildId)) {
            servers.set(guildId, {
                queue: [],
                player: createAudioPlayer(),
                connection: null,
                playing: false,
                voiceChannel: voiceChannel.id,
                textChannel: message.channel.id
            });
        }

        const server = servers.get(guildId);
        const query = args.join(' ');

        server.queue.push({
            title: query,
            url: query.startsWith('http') ? query : null,
            requestedBy: message.author.tag,
            thumbnail: null
        });

        if (!server.connection || server.connection.state.status === VoiceConnectionStatus.Destroyed) {
            try {
                server.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: message.guild.voiceAdapterCreator
                });

                server.connection.on(VoiceConnectionStatus.Disconnected, () => {
                    setTimeout(() => {
                        if (server.connection && server.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                            try { server.connection.destroy(); } catch {}
                        }
                    }, 5000);
                });

                server.connection.subscribe(server.player);

                server.player.on(AudioPlayerStatus.Idle, () => {
                    server.queue.shift();
                    if (server.queue.length > 0) {
                        playNext(server, message);
                    } else {
                        server.playing = false;
                        setTimeout(() => {
                            if (server.queue.length === 0 && server.connection) {
                                try { server.connection.destroy(); } catch {}
                                servers.delete(guildId);
                            }
                        }, 60000);
                    }
                });

                server.player.on('error', (error) => {
                    console.error('Player error:', error.message);
                    server.queue.shift();
                    if (server.queue.length > 0) playNext(server, message);
                });

            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Connection Failed', `Could not join voice: ${error.message}`)] });
            }
        }

        const position = server.queue.length;

        if (!server.playing) {
            server.playing = true;
            playNext(server, message);
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x00d26a,
                title: position === 1 ? 'Now Playing' : 'Added to Queue',
                description: `**${query}**`,
                fields: [
                    { name: 'Channel', value: `${voiceChannel}`, inline: true },
                    { name: 'Queue', value: `${server.queue.length} song(s)`, inline: true }
                ]
            })]
        });
    }
};

function playNext(server, message) {
    if (server.queue.length === 0) return;

    const song = server.queue[0];

    // For actual playback, you need a stream source
    // This creates a placeholder - integrate with ytdl-core, distube, or lavalink for real playback
    try {
        // Example with ytdl-core (install separately):
        // const ytdl = require('ytdl-core');
        // const stream = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1 << 25 });
        // const resource = createAudioResource(stream);
        // server.player.play(resource);

        const textChannel = message.guild.channels.cache.get(server.textChannel);
        if (textChannel) {
            textChannel.send({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Now Playing',
                    description: `**${song.title}**\nRequested by ${song.requestedBy}\n\n*Note: To enable real audio, install \`ytdl-core\` and uncomment the stream code in play.js*`
                })]
            }).catch(() => {});
        }
    } catch (error) {
        console.error('Play error:', error.message);
        server.queue.shift();
        if (server.queue.length > 0) playNext(server, message);
    }
}

module.exports.servers = servers;
