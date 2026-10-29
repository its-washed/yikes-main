const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

const CLIENT_ID = 'e3c57e9a39a2472e9e4606caed8af133';
const CLIENT_SECRET = '4f3a64f1082e400491cf1e2f0cbdffd0';

const pendingDevices = new Map();

function spotifyReply(message, text) {
    return message.reply({
        embeds: [{ color: COLORS.SPOTIFY, description: `${EMOJIS.SPOTIFY} ${message.author.mention}: ${text}` }]
    });
}

function notLinked(message) {
    return warn(message, `You haven't linked your Spotify account yet\n> Use \`,spotify login\` to link your account`);
}

async function getSpotifyTokens(discordId) {
    return first('SELECT access_token, refresh_token FROM spotify_tokens WHERE discord_id = ?', discordId) || null;
}

async function refreshAccessToken(refreshToken) {
    try {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: String(refreshToken),
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        });
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        if (res.status !== 200) return null;
        const data = await res.json();
        return data.access_token || null;
    } catch {
        return null;
    }
}

async function ensureAccessToken(discordId) {
    const tokens = await getSpotifyTokens(discordId);
    if (!tokens) return [null, null];
    let accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    try {
        const res = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 401) {
            const newToken = await refreshAccessToken(refreshToken);
            if (newToken) {
                run('UPDATE spotify_tokens SET access_token = ? WHERE discord_id = ?', newToken, discordId);
                accessToken = newToken;
            } else {
                return [null, null];
            }
        } else if (res.status !== 200) {
            return [null, null];
        }
    } catch {
        return [null, null];
    }
    return [accessToken, refreshToken];
}

async function getCurrentTrack(accessToken) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 200) {
            const data = await res.json();
            if (data && data.is_playing) {
                const track = data.item;
                return [track.name, track.artists[0].name, track.external_urls.spotify];
            }
        }
    } catch {
    }
    return [null, null, null];
}

function selectedDevice(discordId) {
    const row = first('SELECT device_id FROM spotify_devices WHERE discord_id = ?', discordId);
    return row ? row.device_id : null;
}

async function activateDevice(accessToken, deviceId) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [deviceId], play: false })
        });
        return res.status === 204;
    } catch {
        return false;
    }
}

async function needDevice(message) {
    const deviceId = selectedDevice(message.author.id);
    if (!deviceId) {
        await warn(message, `You haven't selected a device\n> Use \`,spotify device\` to choose a device`);
        return null;
    }
    return deviceId;
}

async function spotifyApi(message) {
    const [accessToken] = await ensureAccessToken(message.author.id);
    if (!accessToken) {
        await notLinked(message);
        return null;
    }
    const deviceId = await needDevice(message);
    if (!deviceId) return null;
    return { accessToken, deviceId };
}

async function getPlaylists(accessToken) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/playlists', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 200) {
            const data = await res.json();
            return (data.items || []).map(p => ({ name: p.name, id: p.id, url: p.external_urls.spotify }));
        }
    } catch {
    }
    return null;
}

module.exports = {
    data: { name: 'spotify', description: 'Spotify Integration Commands', usage: ',spotify <login|logout|play|pause|resume|devices|current|volume|info|skip|back|playlists|playlist>' },
    aliases: ['sp'],
    cooldown: 5,
    subcommands: ['login', 'logout', 'play', 'pause', 'resume', 'devices', 'current', 'volume', 'info', 'skip', 'back', 'playlists', 'playlist'],
    subUsages: {
        login: ',spotify login',
        logout: ',spotify logout',
        play: ',spotify play <track>',
        pause: ',spotify pause',
        resume: ',spotify resume',
        devices: ',spotify devices',
        current: ',spotify current',
        volume: ',spotify volume [0-100]',
        info: ',spotify info [member]',
        skip: ',spotify skip',
        back: ',spotify back',
        playlists: ',spotify playlists',
        playlist: ',spotify playlist <name>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        login: {
            aliases: [],
            data: { name: 'spotify login', description: 'Login to your Spotify account', usage: ',spotify login' },
            execute: async (message) => {
                const tokens = await getSpotifyTokens(message.author.id);
                if (tokens) {
                    try {
                        const res = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
                        if (res.status === 200) {
                            const user = await res.json();
                            return warn(message, `You are already logged in as **${user.display_name || 'Unknown User'}**\n> Use \`,spotify logout\` to logout`);
                        }
                    } catch {
                    }
                    return warn(message, `You are already logged in\n> Use \`,spotify logout\` to logout`);
                }
                return spotifyReply(message, 'Click [**here**](https://evelina.bot/spotify) to **grant** Evelina access to your **Spotify account**. Once you\'ve passed the **authorization**, you can use the Spotify commands');
            }
        },
        logout: {
            aliases: [],
            data: { name: 'spotify logout', description: 'Logout from Spotify your account', usage: ',spotify logout' },
            execute: async (message) => {
                const tokens = await getSpotifyTokens(message.author.id);
                if (!tokens) return notLinked(message);
                run('DELETE FROM spotify_tokens WHERE discord_id = ?', message.author.id);
                return spotifyReply(message, 'Logged out successfully');
            }
        },
        play: {
            aliases: [],
            data: { name: 'spotify play', description: 'Start playing a track on Spotify', usage: ',spotify play <track>' },
            execute: async (message, args) => {
                const track = args.join(' ').trim();
                if (!track) return warn(message, 'Usage: `spotify play <track>`');
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                const { accessToken, deviceId } = ctx;
                if (!await activateDevice(accessToken, deviceId)) {
                    return warn(message, 'Failed to activate the selected device, try again later');
                }
                try {
                    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(track)}&type=track&limit=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (res.status === 200) {
                        const data = await res.json();
                        if (data.tracks.items.length) {
                            const found = data.tracks.items[0];
                            const play = await fetch('https://api.spotify.com/v1/me/player/play', {
                                method: 'PUT',
                                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ uris: [found.uri], device_id: deviceId })
                            });
                            if (play.status === 204) {
                                return spotifyReply(message, `Playing: [**${found.name}**](${found.external_urls.spotify}) by **${found.artists[0].name}**`);
                            }
                            return warn(message, 'An error occurred while playing the track');
                        }
                        return warn(message, `Track **${track}** not found on Spotify`);
                    }
                } catch {
                    return warn(message, 'An error occurred while playing the track');
                }
            }
        },
        pause: {
            aliases: [],
            data: { name: 'spotify pause', description: 'Pause the current playback on Spotify if it is not already paused', usage: ',spotify pause' },
            execute: async (message) => {
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ device_id: ctx.deviceId })
                    });
                    if (res.status === 200) return spotifyReply(message, 'Playback paused successfully');
                } catch {
                }
                return warn(message, 'An error occurred while pausing the playback');
            }
        },
        resume: {
            aliases: [],
            data: { name: 'spotify resume', description: 'Resume playback on Spotify if it is currently paused', usage: ',spotify resume' },
            execute: async (message) => {
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/play', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ device_id: ctx.deviceId })
                    });
                    if (res.status === 200) return spotifyReply(message, 'Track resumed successfully');
                } catch {
                }
                return warn(message, 'An error occurred while resuming the playback');
            }
        },
        devices: {
            aliases: ['device'],
            data: { name: 'spotify devices', description: 'Shows available devices for Spotify playback with a dropdown menu', usage: ',spotify devices' },
            execute: async (message) => {
                const [accessToken] = await ensureAccessToken(message.author.id);
                if (!accessToken) return notLinked(message);
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/devices', { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (res.status !== 200) return warn(message, 'Failed to retrieve the devices.');
                    const devices = (await res.json()).devices || [];
                    if (!devices.length) return warn(message, 'No devices found, open Spotify on a device to see it here');
                    const typeEmojis = {
                        Computer: '💻', Smartphone: '📱', Speaker: '🔊', TV: '📺', AVR: '🎛️', STB: '📦',
                        AudioDongle: '🎧', CastVideo: '📡', CastAudio: '🔈', Automobile: '🚗', GameConsole: '🎮', Unknown: '❓'
                    };
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('spotify_device_select')
                        .setPlaceholder('Choose a Spotify device')
                        .addOptions(devices.slice(0, 25).map(d => new StringSelectMenuOptionBuilder()
                            .setLabel(d.name)
                            .setEmoji(typeEmojis[d.type] || '❓')
                            .setValue(d.id)));
                    const sent = await message.reply({
                        embeds: [{ color: COLORS.SPOTIFY, description: `${EMOJIS.SPOTIFY} ${message.author.mention}: Please choose a device from the dropdown:` }],
                        components: [new ActionRowBuilder().addComponents(menu)]
                    });
                    pendingDevices.set(sent.id, { devices, accessToken, userId: message.author.id });
                    setTimeout(() => { pendingDevices.delete(sent.id); sent.delete().catch(() => {}); }, 60000);
                } catch {
                    return warn(message, 'Failed to retrieve the devices.');
                }
            }
        },
        current: {
            aliases: [],
            data: { name: 'spotify current', description: 'Displays the currently playing track on Spotify', usage: ',spotify current' },
            execute: async (message) => {
                const [accessToken] = await ensureAccessToken(message.author.id);
                if (!accessToken) return notLinked(message);
                const [trackName, artistName, trackUrl] = await getCurrentTrack(accessToken);
                if (!trackName) return warn(message, 'No track is currently playing');
                return spotifyReply(message, `Currently playing: [**${trackName}**](${trackUrl}) by **${artistName}**`);
            }
        },
        volume: {
            aliases: ['vol'],
            data: { name: 'spotify volume', description: 'Check or set the volume on the selected Spotify device', usage: ',spotify volume [0-100]' },
            execute: async (message, args) => {
                const [accessToken] = await ensureAccessToken(message.author.id);
                if (!accessToken) return notLinked(message);
                const deviceId = await needDevice(message);
                if (!deviceId) return;
                const volume = args[0] !== undefined ? parseInt(args[0], 10) : null;
                if (volume === null || Number.isNaN(volume)) {
                    try {
                        const res = await fetch('https://api.spotify.com/v1/me/player', { headers: { Authorization: `Bearer ${accessToken}` } });
                        if (res.status === 200) {
                            const data = await res.json();
                            if (data && data.device && data.device.volume_percent !== null && data.device.volume_percent !== undefined) {
                                return spotifyReply(message, `Current volume: **${data.device.volume_percent}%**`);
                            }
                            return warn(message, 'Failed to retrieve the current volume.');
                        }
                        return warn(message, 'Failed to retrieve the playback status.');
                    } catch {
                        return warn(message, 'Failed to retrieve the playback status.');
                    }
                }
                if (volume < 0 || volume > 100) return warn(message, 'Volume must be between 0 and 100.');
                try {
                    const res = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}&device_id=${deviceId}`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (res.status === 204) return spotifyReply(message, `Volume set to **${volume}%**`);
                } catch {
                }
                return warn(message, 'Failed to set the volume. Make sure a device is active and try again.');
            }
        },
        info: {
            aliases: [],
            data: { name: 'spotify info', description: 'Displays information about the connected Spotify account and active device.', usage: ',spotify info [member]' },
            execute: async (message, args) => {
                const user = message.mentions.members.first() || message.member;
                const [accessToken] = await ensureAccessToken(user.id);
                if (!accessToken) {
                    if (user.id !== message.author.id) return warn(message, `**${user.displayName}** hasn't linked their Spotify account yet`);
                    return notLinked(message);
                }
                try {
                    const profileRes = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (profileRes.status !== 200) return warn(message, 'Failed to retrieve Spotify user information.');
                    const user_data = await profileRes.json();
                    const images = user_data.images || [];
                    const avatar = images.length ? images[0].url : null;
                    let deviceInfo = 'No active device found.';
                    const playbackRes = await fetch('https://api.spotify.com/v1/me/player', { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (playbackRes.status === 200) {
                        const playback = await playbackRes.json();
                        if (playback && playback.device) {
                            deviceInfo = `**${playback.device.name || 'Unknown Device'}**\n> \`${playback.device.id || 'Unknown ID'}\``;
                        }
                    }
                    const fields = [
                        { name: 'Account ID', value: `\`${user_data.id || 'Unknown ID'}\``, inline: true },
                        { name: 'Subscription', value: String(user_data.product || 'Free').charAt(0).toUpperCase() + String(user_data.product || 'free').slice(1), inline: true },
                        { name: 'Active Device', value: deviceInfo, inline: false }
                    ];
                    return message.reply({
                        embeds: [{
                            color: COLORS.SPOTIFY,
                            title: 'Spotify Account Information',
                            author: { name: user_data.display_name || 'Unknown User', icon_url: avatar || undefined },
                            fields
                        }]
                    });
                } catch {
                    return warn(message, 'Failed to retrieve Spotify user information.');
                }
            }
        },
        skip: {
            aliases: [],
            data: { name: 'spotify skip', description: 'Skip to the next track', usage: ',spotify skip' },
            execute: async (message) => {
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/next', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ device_id: ctx.deviceId })
                    });
                    if (res.status === 200) {
                        await new Promise(r => setTimeout(r, 1000));
                        const [trackName, artistName, trackUrl] = await getCurrentTrack(ctx.accessToken);
                        if (trackName) return spotifyReply(message, `Skipped to: [**${trackName}**](${trackUrl}) by **${artistName}**`);
                        return spotifyReply(message, 'Skipped to the next track, but unable to retrieve track information.');
                    }
                } catch {
                }
                return warn(message, 'Failed to skip to the next track. Please try again later.');
            }
        },
        back: {
            aliases: [],
            data: { name: 'spotify back', description: 'Go back to the previous track', usage: ',spotify back' },
            execute: async (message) => {
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ device_id: ctx.deviceId })
                    });
                    if (res.status === 200) {
                        await new Promise(r => setTimeout(r, 1000));
                        const [trackName, artistName, trackUrl] = await getCurrentTrack(ctx.accessToken);
                        if (trackName) return spotifyReply(message, `Back to: [**${trackName}**](${trackUrl}) by **${artistName}**`);
                        return spotifyReply(message, 'Went back to the previous track, but unable to retrieve track information.');
                    }
                } catch {
                }
                return warn(message, 'Failed to go back to the previous track. Please try again later.');
            }
        },
        playlists: {
            aliases: [],
            data: { name: 'spotify playlists', description: 'Displays all Spotify playlists of the user', usage: ',spotify playlists' },
            execute: async (message) => {
                const [accessToken] = await ensureAccessToken(message.author.id);
                if (!accessToken) return notLinked(message);
                const playlists = await getPlaylists(accessToken);
                if (!playlists || !playlists.length) return warn(message, 'No playlists found.');
                return paginate(message, playlists.map(p => `**${p.name}**`), 'Your Spotify Playlists');
            }
        },
        playlist: {
            aliases: [],
            data: { name: 'spotify playlist', description: 'Plays a specific Spotify playlist by name', usage: ',spotify playlist <name>' },
            execute: async (message, args) => {
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `spotify playlist <name>`');
                const ctx = await spotifyApi(message);
                if (!ctx) return;
                const playlists = await getPlaylists(ctx.accessToken);
                if (!playlists || !playlists.length) return warn(message, 'No playlists found.');
                const match = playlists.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
                if (!match) return warn(message, `No playlist found with the name **${name}**.`);
                try {
                    const res = await fetch('https://api.spotify.com/v1/me/player/play', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${ctx.accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ context_uri: `spotify:playlist:${match.id}`, device_id: ctx.deviceId })
                    });
                    if (res.status === 204) return spotifyReply(message, `Playing playlist: [**${match.name}**](${match.url})`);
                } catch {
                }
                return warn(message, 'Failed to play the selected playlist. Please try again.');
            }
        }
    }
};

module.exports.pendingDevices = pendingDevices;
