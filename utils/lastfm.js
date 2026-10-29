const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { COLORS, EMOJIS } = require('./styles');
const { first } = require('./database');

const API_KEY = process.env.LASTFM_API_KEY || '572042e8c50931505cc992dd04db5f5e';
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const FONT_PATH = path.join(__dirname, '../data/fonts/Heavitas.ttf');

let fontRegistered = false;
try {
    if (fs.existsSync(FONT_PATH)) {
        GlobalFonts.registerFromPath(FONT_PATH, 'Heavitas');
        fontRegistered = true;
    }
} catch (err) {}

async function request(params) {
    const url = new URL(BASE_URL);
    const data = { api_key: API_KEY, format: 'json', ...params };
    for (const [key, value] of Object.entries(data)) url.searchParams.set(key, String(value));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return res.json();
}

async function userExists(user) {
    const info = await getUserInfo(user);
    return !('error' in info);
}

async function getTrackPlaycount(user, track) {
    try {
        const response = await request({
            method: 'track.getInfo',
            artist: track.artist['#text'],
            track: track.name,
            username: user
        });
        if ('error' in response) return 0;
        return Number(response.track && response.track.userplaycount) || 0;
    } catch (err) {
        return 0;
    }
}

async function getAlbumPlaycount(user, track) {
    try {
        const response = await request({
            method: 'album.getInfo',
            artist: track.artist['#text'],
            album: track.album['#text'],
            username: user
        });
        if ('error' in response) return 0;
        return Number(response.album && response.album.userplaycount) || 0;
    } catch (err) {
        return 0;
    }
}

async function getArtistPlaycount(user, artist) {
    try {
        const response = await request({
            method: 'artist.getInfo',
            artist,
            username: user
        });
        if ('error' in response) return 0;
        return Number(response.artist && response.artist.stats && response.artist.stats.userplaycount) || 0;
    } catch (err) {
        return 0;
    }
}

async function getUserInfo(user) {
    try {
        const response = await request({ method: 'user.getinfo', user });
        if ('error' in response) return { error: 'User not found' };
        return response;
    } catch (err) {
        return { error: `Unexpected error: ${err.message}` };
    }
}

async function getArtistInfo(artist) {
    try {
        const response = await request({ method: 'artist.getinfo', artist });
        if ('error' in response) return { error: 'Artist not found' };
        return response;
    } catch (err) {
        return { error: `Unexpected error: ${err.message}` };
    }
}

async function getTopArtists(user, count) {
    try {
        const response = await request({ method: 'user.getTopArtists', user, limit: count });
        if ('error' in response) return { topartists: { artist: [] } };
        return response;
    } catch (err) {
        return { topartists: { artist: [] } };
    }
}

async function getTopTracks(user, count) {
    try {
        const response = await request({ method: 'user.getTopTracks', user, limit: count, period: 'overall' });
        if ('error' in response) return { toptracks: { track: [] } };
        return response;
    } catch (err) {
        return { toptracks: { track: [] } };
    }
}

async function getTopAlbums(user, count) {
    try {
        const response = await request({ method: 'user.getTopAlbums', user, limit: count, period: 'overall' });
        if ('error' in response) return { topalbums: { album: [] } };
        return response;
    } catch (err) {
        return { topalbums: { album: [] } };
    }
}

async function getTracksRecent(user, count = 10) {
    try {
        const response = await request({ method: 'user.getrecenttracks', user, limit: count });
        if ('error' in response) return { recenttracks: { track: [] } };
        return response;
    } catch (err) {
        return { recenttracks: { track: [] } };
    }
}

async function getChartsTopAlbums(username, period, limit) {
    return request({ method: 'user.getTopAlbums', user: username, period, limit });
}

async function fetchImage(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to read image with status ${res.status}`);
    return loadImage(Buffer.from(await res.arrayBuffer()));
}

function createTextImage(text) {
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#000000';
    const font = fontRegistered ? '15px Heavitas' : '15px sans-serif';
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textX = (200 - metrics.width) / 2 - 10;
    ctx.fillText(text, textX, 70);
    return canvas;
}

function drawCover(ctx, img, x, y, size) {
    const iw = img.width;
    const ih = img.height;
    const scale = Math.max(size / iw, size / ih);
    const sw = size / scale;
    const sh = size / scale;
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
}

async function lastfmChart(username, size = '3x3', period = 'overall') {
    const match = /^(\d+)x(\d+)$/.exec(size);
    if (!match) throw new Error("Invalid size format. Must be in the format of '3x3', '6x6', '9x9', etc.");
    const cols = Number(match[1]);
    const rows = Number(match[2]);
    const albumCount = cols * rows;
    if (albumCount > 50) throw new Error("Your chart can't contain more than 50 albums.");

    const data = await getChartsTopAlbums(username, period, albumCount);
    if (!data.topalbums || !data.topalbums.album) throw new Error('No top albums found for the specified period.');
    const albums = data.topalbums.album.slice(0, albumCount);
    if (!albums.length) throw new Error('No top albums found for the specified period.');

    const images = await Promise.all(albums.map(async (album) => {
        const url = album.image && album.image[2] && album.image[2]['#text'];
        if (url) {
            try {
                return await fetchImage(url);
            } catch (err) {}
        }
        return createTextImage(album.name || '');
    }));

    const targetSize = 300;
    const canvas = createCanvas(cols * targetSize, rows * targetSize);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, idx) => {
        const x = (idx % cols) * targetSize;
        const y = Math.floor(idx / cols) * targetSize;
        drawCover(ctx, img, x, y, targetSize);
    });
    return Buffer.from(canvas.toBuffer('image/png'));
}

function urlEncode(value) {
    if (value === undefined || value === null) return '';
    return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

async function lastfmReplacement(user, params) {
    const recent = await getTracksRecent(user, 1);
    const userinfo = await getUserInfo(user);
    const track = recent.recenttracks && recent.recenttracks.track && recent.recenttracks.track[0];
    if (!track) throw new Error('No recent tracks');
    if (!userinfo.user) throw new Error('Invalid user info');

    const userpfp = urlEncode(userinfo.user.image && userinfo.user.image[2] && userinfo.user.image[2]['#text']);
    const artist = track.artist['#text'] || '';
    const albumText = (track.album && track.album['#text']) || '';

    let albumplays = 'N/A';
    try { albumplays = await getAlbumPlaycount(user, track); } catch (err) {}
    const artistplays = await getArtistPlaycount(user, artist);
    const trackplays = (await getTrackPlaycount(user, track)) || 'N/A';
    const albumSlug = albumText ? albumText.replace(/ /g, '+') : 'N/A';

    const replacements = [
        ['{track.name}', track.name || ''],
        ['{lower(track.name)}', (track.name || '').toLowerCase()],
        ['{track.url}', urlEncode(track.url)],
        ['{artist.name}', artist],
        ['{lower(artist.name)}', artist.toLowerCase()],
        ['{artist.url}', urlEncode(`https://last.fm/music/${artist.replace(/ /g, '+')}`)],
        ['{track.image}', urlEncode(track.image && track.image[3] && track.image[3]['#text'])],
        ['{artist.plays}', String(artistplays)],
        ['{album.plays}', String(albumplays)],
        ['{track.plays}', String(trackplays)],
        ['{album.name}', albumText || 'N/A'],
        ['{lower(album.name)}', albumText ? albumText.toLowerCase() : 'N/A'],
        ['{album.url}', urlEncode(`https://www.last.fm/music/${artist.replace(/ /g, '+')}/${albumSlug}`)],
        ['{username}', user],
        ['{scrobbles}', String(recent.recenttracks['@attr'].total)],
        ['{useravatar}', userpfp],
        ['{lastfm.color}', '#ffff00'],
        ['{lastfm.emoji}', EMOJIS.LASTFM],
        ['{album.image}', urlEncode(track.image && track.image[3] && track.image[3]['#text'])],
        ['{artist.image}', urlEncode(userinfo.user.image && userinfo.user.image[3] && userinfo.user.image[3]['#text'])]
    ];
    let out = params;
    for (const [key, value] of replacements) out = out.split(key).join(value === undefined || value === null ? '' : String(value));
    return out;
}

function lfSend(message, text) {
    return message.reply({ embeds: [{ color: COLORS.LASTFM, description: `${EMOJIS.LASTFM} ${message.author}: ${text}` }] });
}

function getPrefix(config) {
    return (config && config.prefix) || ',';
}

async function needLastfm(message, config) {
    const check = first('SELECT 1 AS ok FROM lastfm WHERE user_id = ?', message.author.id);
    if (!check) {
        await lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
        return false;
    }
    return true;
}

function getUsername(userId) {
    const row = first('SELECT username FROM lastfm WHERE user_id = ?', userId);
    return row ? row.username : null;
}

function memberOrSelf(message, args = []) {
    const mention = message.mentions.members.first() || message.mentions.users.first();
    if (mention) return mention;
    for (const arg of args) {
        const match = /^(?:<@!?)?(\d{17,20})>?$/.exec(String(arg).trim());
        if (match) {
            const member = message.guild.members.cache.get(match[1]);
            if (member) return member;
        }
    }
    return message.member || message.author;
}

module.exports = {
    API_KEY,
    userExists,
    getTrackPlaycount,
    getAlbumPlaycount,
    getArtistPlaycount,
    getUserInfo,
    getArtistInfo,
    getTopArtists,
    getTopTracks,
    getTopAlbums,
    getTracksRecent,
    getChartsTopAlbums,
    lastfmChart,
    lastfmReplacement,
    urlEncode,
    lfSend,
    getPrefix,
    needLastfm,
    getUsername,
    memberOrSelf
};
