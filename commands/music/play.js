const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const { Readable } = require('stream');
const { Ytdl, Quality, SearchType } = require('@distube/ytdl-core');
const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');

const servers = new Map();
const yt = new Ytdl();

const URL_RE = /^https?:\/\//i;
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/|playlist\?)|youtu\.be\/)/i;
const AUDIO_EXT_RE = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|webm|mp4)(\?|#|$)/i;
const PLAYLIST_CAP = 100;

module.exports = {
    data: {
        name: 'play',
        description: 'Play a song or playlist in your voice channel',
        usage: ',play [song name | song URL | playlist URL]'
    },
    aliases: ['p'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Song', 'Provide a song name, URL or playlist link.')] });
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });
        }

        const permissions = voiceChannel.permissionsFor(message.guild.members.me);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return message.reply({ embeds: [permissionDenied(message, 'connect, speak', { bot: true })] });
        }

        const guildId = message.guild.id;
        const query = args.join(' ');
        const requestedBy = displayName(message.author);
        const requestedByAvatar = message.author.displayAvatarURL({ size: 64 });

        const listId = playlistIdOf(query);
        if (listId) {
            let playlist;
            try {
                playlist = await yt.getPlaylist('https://www.youtube.com/playlist?list=' + listId);
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Playlist Error', `Could not load that playlist: ${error.message}`)] });
            }

            const videos = (playlist.videos || []).slice(0, PLAYLIST_CAP);
            if (!videos.length) {
                return message.reply({ embeds: [errorEmbed('Playlist Empty', 'That playlist has no playable videos.')] });
            }

            const server = ensureServer(guildId, message);
            server.textChannel = message.channel.id;

            for (const v of videos) {
                server.queue.push({
                    title: v.title,
                    url: v.url,
                    requestedBy,
                    requestedByAvatar,
                    thumbnail: Array.isArray(v.thumbnails) && v.thumbnails.length ? v.thumbnails[v.thumbnails.length - 1].url : null,
                    authorName: typeof v.author === 'string' ? v.author : (v.author?.name || ''),
                    durationSec: null,
                    metaResolved: true,
                    info: null
                });
            }

            try {
                connect(server, guildId, message, voiceChannel);
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Connection Failed', `Could not join voice: ${error.message}`)] });
            }

            if (!server.playing) {
                server.playing = true;
                playNext(server, guildId, message, false);
            }

            const count = playlist.videos.length > videos.length
                ? `${videos.length} of ${playlist.videos.length} tracks queued`
                : `${videos.length} track${videos.length !== 1 ? 's' : ''} queued`;

            return message.reply({
                embeds: [createEmbed({
                    timestamp: false,
                    title: 'Playlist added to queue',
                    description: `**${playlist.title}**\n${count}`,
                    footer: { text: `Requested by ${requestedBy}`, iconURL: requestedByAvatar }
                })]
            });
        }

        const song = {
            title: query,
            url: URL_RE.test(query) ? query : null,
            requestedBy,
            requestedByAvatar,
            thumbnail: null,
            authorName: '',
            durationSec: null,
            metaResolved: false,
            info: null
        };

        try {
            await resolveMeta(song);
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Not Found', `Could not find **${query}** — ${error.message}`)] });
        }

        const server = ensureServer(guildId, message);
        server.textChannel = message.channel.id;
        server.queue.push(song);

        try {
            connect(server, guildId, message, voiceChannel);
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Connection Failed', `Could not join voice: ${error.message}`)] });
        }

        if (!server.playing) {
            server.playing = true;
            playNext(server, guildId, message, false);
        }

        return message.reply({ embeds: [trackEmbed(song, 'Track added to queue')] });
    }
};

function ensureServer(guildId, message) {
    if (!servers.has(guildId)) {
        const server = {
            queue: [],
            player: createAudioPlayer(),
            connection: null,
            playing: false,
            voiceChannel: null,
            textChannel: message.channel.id,
            loop: null,
            volume: 1,
            currentResource: null,
            currentStream: null,
            skipRequested: false,
            stay247: false
        };
        servers.set(guildId, server);

        server.player.on(AudioPlayerStatus.Idle, () => advance(server, guildId, message));
        server.player.on('error', (error) => {
            console.error('Player error:', error.message);
            destroyStream(server);
        });
    }
    return servers.get(guildId);
}

function connect(server, guildId, message, channel) {
    const current = server.connection;
    const alive = current && current.state.status !== VoiceConnectionStatus.Destroyed;

    if (alive && current.joinConfig?.channelId === channel.id) return;

    if (alive) {
        try {
            current.removeAllListeners(VoiceConnectionStatus.Disconnected);
            current.destroy();
        } catch {}
        server.connection = null;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId,
        adapterCreator: message.guild.voiceAdapterCreator
    });
    server.connection = connection;
    server.voiceChannel = channel.id;

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        const conn = connection;
        setTimeout(() => {
            if (servers.get(guildId) !== server || server.connection !== conn) return;
            if (conn.state.status !== VoiceConnectionStatus.Disconnected) return;

            if (server.stay247) {
                const target = message.guild.channels.cache.get(server.voiceChannel);
                if (!target) {
                    teardown(server, guildId, conn);
                    return;
                }
                try {
                    conn.rejoin({ channelId: target.id });
                    console.log(`[24/7] Disconnected from voice — rejoining ${target.name}`);
                } catch (error) {
                    console.error('[24/7] Rejoin failed:', error.message);
                    try { conn.destroy(); } catch {}
                    server.connection = null;
                    try { connect(server, guildId, message, target); } catch (e2) {
                        console.error('[24/7] Reconnect failed:', e2.message);
                    }
                }
                return;
            }

            teardown(server, guildId, conn);
        }, 5000);
    });

    connection.subscribe(server.player);
}

function teardown(server, guildId, connection) {
    servers.delete(guildId);
    destroyStream(server);
    try { connection.destroy(); } catch {}
    try { server.player.stop(true); } catch {}
}

async function playNext(server, guildId, message, announce) {
    if (servers.get(guildId) !== server) return;
    const song = server.queue[0];
    if (!song) {
        server.playing = false;
        return;
    }

    try {
        if (!song.metaResolved) await resolveMeta(song);
        if (servers.get(guildId) !== server || server.queue[0] !== song) return;

        const stream = await ensureStream(song);
        if (servers.get(guildId) !== server || server.queue[0] !== song) {
            stream?.destroy?.();
            return;
        }

        server.currentStream = stream;
        stream.on('error', (error) => console.error('Stream error:', error.message));

        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });
        if (resource.volume) resource.volume.setVolumeLogarithmic(server.volume ?? 1);

        server.currentResource = resource;
        server.player.play(resource);

        if (announce) postTo(server, message, trackEmbed(song, 'Now Playing'));
    } catch (error) {
        if (servers.get(guildId) !== server) return;

        const index = server.queue.indexOf(song);
        if (index !== -1) server.queue.splice(index, 1);
        server.skipRequested = false;

        postTo(server, message, errorEmbed('Playback Failed', `Could not play **${song.title}**\n${error.message}`));

        if (server.queue.length > 0) return playNext(server, guildId, message, announce);

        server.playing = false;
        scheduleLeave(server, guildId);
    }
}

function advance(server, guildId, message) {
    if (servers.get(guildId) !== server) return;

    destroyStream(server);
    server.currentResource = null;

    const finished = server.queue[0];
    if (finished) {
        if (server.skipRequested) {
            server.skipRequested = false;
            server.queue.shift();
        } else if (server.loop === 'queue') {
            server.queue.push(server.queue.shift());
        } else if (server.loop !== 'song') {
            server.queue.shift();
        }
    }

    if (server.queue.length > 0) {
        playNext(server, guildId, message, true);
    } else {
        server.playing = false;
        scheduleLeave(server, guildId);
    }
}

async function resolveMeta(song) {
    if (song.metaResolved) return;

    if (song.url && !YOUTUBE_RE.test(song.url)) {
        const name = decodeURIComponent(new URL(song.url).pathname.split('/').pop() || song.url);
        song.title = name;
        song.authorName = '';
        song.thumbnail = null;
        song.durationSec = null;
        song.metaResolved = true;
        return;
    }

    let target = song.url;
    if (!target) {
        const [result] = await yt.search(song.title, { limit: 1, type: SearchType.Video });
        if (!result) throw new Error('no results found');
        target = result.url;
    }

    const info = await yt.getInfo(target);
    song.url = target;
    applyInfo(song, info);
    song.info = info;
    song.metaResolved = true;
}

async function ensureStream(song) {
    if (song.url && !YOUTUBE_RE.test(song.url)) {
        const response = await fetch(song.url, {
            headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
        if (!response.body) throw new Error('Empty response from source');
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (!type.startsWith('audio/') && !type.startsWith('video/') && !AUDIO_EXT_RE.test(song.url)) {
            throw new Error('That link is not a direct audio/video file');
        }
        return Readable.fromWeb(response.body);
    }

    if (!song.info) {
        song.info = await yt.getInfo(song.url);
        applyInfo(song, song.info);
    }

    return yt.download(song.info, {
        quality: Quality.HighestAudio,
        filter: { hasAudio: true, hasVideo: false }
    });
}

function applyInfo(song, info) {
    const details = info.videoDetails;
    song.title = details.title || song.title;
    if (!song.url && details.videoId) song.url = `https://www.youtube.com/watch?v=${details.videoId}`;
    song.authorName = typeof details.author === 'string'
        ? details.author
        : (details.author?.name || details.author?.user || song.authorName || '');
    const thumbs = Array.isArray(details.thumbnails) ? details.thumbnails : [];
    if (thumbs.length) song.thumbnail = thumbs[thumbs.length - 1].url;
    const seconds = parseInt(details.lengthSeconds, 10);
    if (!isNaN(seconds)) song.durationSec = seconds;
}

function trackEmbed(song, heading) {
    const lines = [];
    lines.push(song.url ? `[${song.title}](${song.url})` : `**${song.title}**`);
    if (song.authorName) lines.push(song.authorName);
    if (song.durationSec != null) lines.push(`Duration: **${formatDuration(song.durationSec)}**`);

    return createEmbed({
        timestamp: false,
        title: heading,
        description: lines.join('\n'),
        footer: { text: `Requested by ${song.requestedBy}`, iconURL: song.requestedByAvatar }
    });
}

function playlistIdOf(text) {
    if (!text || !URL_RE.test(text)) return null;
    try {
        const url = new URL(text);
        if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(url.hostname)) return null;
        return url.searchParams.get('list');
    } catch {
        return null;
    }
}

function displayName(user) {
    return user.displayName || user.username;
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function scheduleLeave(server, guildId) {
    setTimeout(() => {
        if (servers.get(guildId) !== server) return;
        if (server.stay247) return;
        if (server.queue.length > 0 || server.playing) return;
        servers.delete(guildId);
        destroyStream(server);
        try { server.connection?.destroy(); } catch {}
    }, 60000);
}

function destroyStream(server) {
    try { server.currentStream?.destroy(); } catch {}
    server.currentStream = null;
}

function postTo(server, message, embed) {
    try {
        const channel = message.guild.channels.cache.get(server.textChannel);
        if (channel) channel.send({ embeds: [embed] }).catch(() => {});
    } catch {}
}

module.exports.servers = servers;
module.exports.ensureServer = ensureServer;
module.exports.connect = connect;
