const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needPerks } = require('../../utils/predicates');
const { query, first, run } = require('../../utils/database');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { Paginator } = require('../../utils/pagination');
const { PRESERVE } = require('../../utils/embeds');
const {
    userExists,
    getUserInfo,
    getArtistInfo,
    getTopArtists,
    getTopTracks,
    getTopAlbums,
    getTracksRecent,
    getAlbumPlaycount,
    getArtistPlaycount,
    getTrackPlaycount,
    lastfmChart,
    lfSend,
    getPrefix,
    getUsername
} = require('../../utils/lastfm');

const PERIODS = ['overall', '7day', '1month', '3month', '6month', '12month'];
const recentCache = new Map();

function fmt(value) {
    return Number(value || 0).toLocaleString('en-US');
}

function splitMember(message, args, required = false) {
    const firstArg = args[0];
    if (firstArg !== undefined) {
        const mention = message.mentions.members.first() || message.mentions.users.first();
        if (mention) return [mention, args.slice(1)];
        const match = /^(\d{17,20})$/.exec(String(firstArg).trim());
        if (match) {
            const member = message.guild.members.cache.get(match[1]);
            if (member) return [member, args.slice(1)];
        }
        if (required) return [null, args];
        return [message.member || message.author, args];
    } else if (required) {
        return [null, args];
    }
    return [message.member || message.author, args];
}

function memberName(member) {
    return member.user ? member.user.username : member.username;
}

function memberAvatar(member) {
    if (member.displayAvatarURL) return member.displayAvatarURL();
    return member.user ? member.user.displayAvatarURL() : '';
}

async function paginateImage(message, lines, title, author, image) {
    const chunks = [];
    for (let i = 0; i < lines.length; i += 12) chunks.push(lines.slice(i, i + 12));
    const pages = chunks.map(chunk => ({
        [PRESERVE]: true,
        color: COLORS.NEUTRAL,
        title,
        author,
        image: image ? { url: image } : undefined,
        description: chunk.join('\n')
    }));
    const paginator = new Paginator(pages, { userId: message.author.id });
    const embeds = paginator.buildEmbeds();
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const sent = await message.reply({ embeds, components });
    if (pages.length > 1) await paginator.start(message.channel, sent);
    return sent;
}

function embedPages(message, pages) {
    const paginator = new Paginator(pages, { userId: message.author.id });
    const embeds = paginator.buildEmbeds();
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    return { paginator, embeds, components };
}

async function sendPages(message, pages) {
    const { paginator, embeds, components } = embedPages(message, pages);
    const sent = await message.reply({ embeds, components });
    if (pages.length > 1) await paginator.start(message.channel, sent);
    return sent;
}

async function resolveRecentTrack(username, target, kind) {
    const recent = await getTracksRecent(username, 50);
    const tracks = (recent.recenttracks && recent.recenttracks.track) || [];
    if (!tracks.length) return { error: "Couldn't retrieve the recent track for your Last.fm account" };
    if (!target) {
        const track = tracks[0];
        if (kind === 'artist') {
            const artist = track.artist && track.artist['#text'];
            if (!artist) return { error: "Couldn't retrieve artist information from the recent track" };
            return { target: artist, track };
        }
        if (kind === 'album') {
            const album = track.album && track.album['#text'];
            if (!album) return { error: "Couldn't retrieve album information from the recent track" };
            return { target: album, track };
        }
        const name = track.name;
        if (!name) return { error: "Couldn't retrieve track information from the recent track" };
        return { target: name, track };
    }
    const needle = target.toLowerCase();
    const track = tracks.find(t => {
        if (kind === 'album') return ((t.album && t.album['#text']) || '').toLowerCase() === needle;
        if (kind === 'track') return (t.name || '').toLowerCase() === needle;
        return ((t.artist && t.artist['#text']) || '').toLowerCase() === needle;
    });
    return { target, track: track || tracks[0], matched: Boolean(track) };
}

async function whoKnows(message, args, client, config, kind, scope) {
    const username = getUsername(message.author.id);
    if (!username) {
        return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
    }

    const requested = args.join(' ').trim() || null;
    const resolved = await resolveRecentTrack(username, requested, kind);
    if (resolved.error) return lfSend(message, resolved.error);
    const target = resolved.target;
    const track = resolved.track;

    if (requested && kind !== 'artist' && !resolved.matched) {
        return warn(message, `Couldn't retrieve ${kind} information for **${target}** from your recent tracks`);
    }

    let artistImage = null;
    if (kind === 'artist') {
        const info = await getArtistInfo(target);
        const images = info.artist && info.artist.image;
        if (images && images[3]) artistImage = images[3]['#text'] || null;
    }

    const rows = query('SELECT * FROM lastfm');
    const entries = [];
    for (const row of rows) {
        if (scope === 'guild') {
            const member = message.guild.members.cache.get(row.user_id);
            if (!member) continue;
            entries.push({ username: row.username, name: memberName(member), userId: row.user_id });
        } else {
            const user = client.users.cache.get(row.user_id);
            if (!user) continue;
            entries.push({ username: row.username, name: user.username, userId: row.user_id });
        }
    }

    const playcounts = await Promise.all(entries.map(entry => {
        if (kind === 'artist') return getArtistPlaycount(entry.username, target);
        if (kind === 'album') return getAlbumPlaycount(entry.username, track);
        return getTrackPlaycount(entry.username, track);
    }));

    const wk = [];
    for (let i = 0; i < entries.length; i++) {
        const count = Number(playcounts[i]);
        if (!Number.isFinite(count) || count === 0) continue;
        wk.push({ ...entries[i], plays: count });
    }
    wk.sort((a, b) => b.plays - a.plays);

    if (!wk.length) {
        if (scope === 'guild') return warn(message, `No one in the server has listened to **${target}**`);
        return lfSend(message, `No one has listened to **${target}**`);
    }

    const lines = wk.map(entry => `[**${entry.name}**](https://last.fm/user/${entry.username}) has **${fmt(entry.plays)}** plays`);
    const title = scope === 'guild' ? `Who knows ${target}` : `Global who knows ${target}`;
    const author = { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
    const sent = await paginateImage(message, lines, title, author, artistImage);

    if (scope === 'global') {
        const top = wk[0];
        const crown = first('SELECT user_id FROM lastfm_crowns WHERE artist = ?', target);
        if (crown) {
            if (String(crown.user_id) === String(top.userId)) return sent;
            run('UPDATE lastfm_crowns SET user_id = ? WHERE artist = ?', top.userId, target);
            const previous = client.users.cache.get(crown.user_id);
            const previousName = previous ? previous.username : `<@${crown.user_id}>`;
            return message.reply({
                embeds: [{ color: COLORS.WARNING, description: `👑 ${message.author}: **${top.name}** took the crown from **${previousName}** for **${target}**!` }]
            });
        }
        run('INSERT INTO lastfm_crowns (artist, user_id) VALUES (?, ?)', target, top.userId);
        return message.reply({
            embeds: [{ color: COLORS.WARNING, description: `👑 ${message.author}: **${top.name}** took the crown for **${target}**!` }]
        });
    }

    return sent;
}

async function topList(message, args, kind) {
    const [member] = splitMember(message, args);
    const check = first('SELECT * FROM lastfm WHERE user_id = ?', member.id);
    if (!check) return lfSend(message, 'There is no **last.fm** account linked for this member');
    const user = check.username;

    let entries = [];
    if (kind === 'artists') entries = ((await getTopArtists(user, 10)).topartists || {}).artist || [];
    else if (kind === 'tracks') entries = ((await getTopTracks(user, 10)).toptracks || {}).track || [];
    else entries = ((await getTopAlbums(user, 10)).topalbums || {}).album || [];

    entries = entries.slice(0, 10);
    if (!entries.length) return warn(message, `No top ${kind} found for this user`);

    const lines = entries.map((entry, i) => `\`${i + 1}.\` **[${entry.name}](${entry.url})** ${fmt(entry.playcount)} plays`);
    const avatar = kind === 'artists' ? memberAvatar(member) : memberAvatar(message.member);
    const label = kind === 'artists' ? 'top artists' : kind === 'tracks' ? 'top tracks' : 'top albums';
    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            description: lines.join('\n'),
            thumbnail: avatar ? { url: avatar } : undefined,
            author: { name: `${user}'s overall ${label}`, icon_url: avatar || undefined }
        }]
    });
}

module.exports = {
    data: {
        name: 'lastfm',
        description: 'Use the Last.fm API integration with evelina',
        usage: ',lastfm <set|chart|plays|topartists|whoknows|...>'
    },
    aliases: ['lf'],
    subcommands: ['set', 'unset', 'chart', 'plays', 'customcommand', 'mode', 'reactions', 'spotify', 'topartists', 'toptracks', 'topalbums', 'howto', 'user', 'whoknows', 'globalwhoknows', 'whoknowsalbum', 'globalwkalbum', 'whoknowstrack', 'globalwktrack', 'taste', 'cover', 'recent', 'playing', 'crowns'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        set: {
            aliases: ['login', 'connect'],
            data: { name: 'lastfm set', description: 'Login and authenticate evelina to use your account', usage: ',lastfm set worldstar' },
            async execute(message, args, client, config) {
                const username = args.join(' ').trim();
                if (!username) return warn(message, 'Usage: `lastfm set <username>`');
                if (!(await userExists(username))) return lfSend(message, "This account **doesn't** exist");
                const existing = first('SELECT user_id FROM lastfm WHERE username = ?', username);
                if (existing && String(existing.user_id) !== String(message.author.id)) {
                    return lfSend(message, 'This username is **already** registered to another user');
                }
                const check = first('SELECT username FROM lastfm WHERE user_id = ?', message.author.id);
                if (check) {
                    if (check.username === username) return lfSend(message, 'You are **already** registered with this name');
                    run('UPDATE lastfm SET username = ? WHERE user_id = ?', username, message.author.id);
                } else {
                    run('INSERT INTO lastfm (user_id, username, reactions) VALUES (?, ?, ?)',
                        message.author.id, username, JSON.stringify(['🔥', '🗑️']));
                }

                const mes = await message.reply({
                    embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Logging in and fetching all informations...` }]
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                const info = await getUserInfo(username);
                if (!info.user) {
                    return mes.edit({
                        embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: This account **doesn't** exist` }]
                    }).catch(() => {});
                }
                return mes.edit({
                    embeds: [{
                        color: COLORS.SUCCESS,
                        description: `${EMOJIS.APPROVE} ${message.author}: Logged in as [**${info.user.name}**](${info.user.url}) with \`${fmt(info.user.playcount)}\` Scrobbles`
                    }]
                }).catch(() => {});
            }
        },

        unset: {
            aliases: ['logout', 'disconnect'],
            data: { name: 'lastfm unset', description: 'Logout and disconnect evelina from your account', usage: ',lastfm unset' },
            async execute(message, args, client, config) {
                const username = getUsername(message.author.id);
                if (!username) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
                run('DELETE FROM lastfm WHERE user_id = ?', message.author.id);
                return lfSend(message, 'Removed your **Last.Fm** account');
            }
        },

        chart: {
            aliases: ['c'],
            data: { name: 'lastfm chart', description: 'View a collage of your most listened to albums', usage: ',lastfm chart [member] [3x3] [7day]' },
            async execute(message, args) {
                let size = '3x3';
                let period = 'overall';
                const rest = [];
                for (const arg of args) {
                    if (/^\d+x\d+$/.test(arg)) size = arg;
                    else if (PERIODS.includes(arg)) period = arg;
                    else rest.push(arg);
                }
                const [member] = splitMember(message, rest);
                const username = getUsername(member.id);
                if (!username) return warn(message, "You havn't scrobbled any songs yet");

                let buffer;
                try {
                    buffer = await lastfmChart(username, size, period);
                } catch (err) {
                    return warn(message, "You havn't scrobbled any songs yet");
                }
                return message.reply({
                    content: `${member}'s Last.FM **${size}** album chart (${period})`,
                    files: [{ attachment: buffer, name: 'chart.png' }]
                });
            }
        },

        plays: {
            aliases: ['p'],
            data: { name: 'lastfm plays', description: 'Get the total amount of plays of a user for certain artist', usage: ',lastfm plays [user] [artist]' },
            async execute(message, args, client, config) {
                const [member, rest] = splitMember(message, args);
                const username = getUsername(member.id);
                if (!username) {
                    if (member.id === message.author.id) return lfSend(message, "You don't have a **last.fm** account connected");
                    return lfSend(message, `**${member}** doesn't have a **last.fm** account connected`);
                }
                let artist = rest.join(' ').trim() || null;
                if (!artist) {
                    const recent = await getTracksRecent(username, 1);
                    const tracks = (recent.recenttracks && recent.recenttracks.track) || [];
                    if (!tracks.length) return lfSend(message, "Couldn't retrieve the recent track for your Last.fm account");
                    artist = tracks[0].artist && tracks[0].artist['#text'];
                    if (!artist) return lfSend(message, "Couldn't retrieve artist information from the recent track");
                }
                const plays = await getArtistPlaycount(username, artist);
                if (!plays) return warn(message, `Couldn't retrieve the amount of plays for **${artist}**`);
                return lfSend(message, `**${memberName(member)}** has **${fmt(plays)}** plays for **${artist}**`);
            }
        },

        customcommand: {
            aliases: ['cc'],
            data: { name: 'lastfm customcommand', description: 'Set a custom command for nowplaying', usage: ',lastfm customcommand bfm' },
            async execute(message, args, client, config) {
                const check = first('SELECT * FROM lastfm WHERE user_id = ?', message.author.id);
                if (!check) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account`);
                const cmd = args.join(' ').trim();
                if (!cmd) return warn(message, 'Usage: `lastfm customcommand <command>`');
                if (cmd.toLowerCase() === 'none') {
                    if (!check.customcmd) return lfSend(message, "You don't have any **custom command**");
                    run('UPDATE lastfm SET customcmd = NULL WHERE user_id = ?', message.author.id);
                    return lfSend(message, 'Removed your **Last.Fm** custom command');
                }
                run('UPDATE lastfm SET customcmd = ? WHERE user_id = ?', cmd, message.author.id);
                return lfSend(message, `You **Last.Fm** custom command set to: ${cmd}`);
            }
        },

        mode: {
            aliases: ['embed'],
            data: { name: 'lastfm mode', description: 'Use a different embed for now playing or create your own', usage: ',lastfm mode <set|remove|reply|view|steal>' },
            subcommands: ['set', 'remove', 'reply', 'view', 'steal'],
            async execute(message) {
                return sendCard(message, module.exports.subs.mode);
            },
            subs: {
                set: {
                    aliases: [],
                    data: { name: 'lastfm mode set', description: 'Set a custom embed for nowplaying', usage: ',lastfm mode set Listening to **{track.name}**' },
                    async execute(message, args, client, config) {
                        const username = getUsername(message.author.id);
                        if (!username) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
                        if (!await needPerks(message, client)) return;
                        const code = args.join(' ').trim();
                        if (!code) return warn(message, 'Usage: `lastfm mode set <code>`');
                        const template = first('SELECT embed FROM embeds_templates WHERE code = ?', code);
                        const finalCode = template ? template.embed : code;
                        run('UPDATE lastfm SET embed = ? WHERE user_id = ?', finalCode, message.author.id);
                        return lfSend(message, `Your custom **Last.Fm** embed is configured to\n\`\`\`${finalCode}\`\`\``);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'lastfm mode remove', description: 'Remove your custom lastfm embed', usage: ',lastfm mode remove' },
                    async execute(message, args, client, config) {
                        const username = getUsername(message.author.id);
                        if (!username) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
                        if (!await needPerks(message, client)) return;
                        run('UPDATE lastfm SET embed = NULL WHERE user_id = ?', message.author.id);
                        return lfSend(message, 'Removed your **Last.Fm** custom embed');
                    }
                },
                reply: {
                    aliases: [],
                    data: { name: 'lastfm mode reply', description: 'Enable or disable if bot should reply with lastfm message', usage: ',lastfm mode reply on' },
                    async execute(message, args, client, config) {
                        const username = getUsername(message.author.id);
                        if (!username) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
                        if (!await needPerks(message, client)) return;
                        const option = (args[0] || '').toLowerCase();
                        if (option === 'on') {
                            run('UPDATE lastfm SET reply = TRUE WHERE user_id = ?', message.author.id);
                            return approve(message, 'Enabled **Last.Fm** reply for custom embed');
                        }
                        if (option === 'off') {
                            run('UPDATE lastfm SET reply = FALSE WHERE user_id = ?', message.author.id);
                            return approve(message, 'Disabled **Last.Fm** reply for custom embed');
                        }
                        return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                    }
                },
                view: {
                    aliases: [],
                    data: { name: 'lastfm mode view', description: "View your custom lastfm embed or someone's lastfm embed", usage: ',lastfm mode view [member]' },
                    async execute(message, args, client) {
                        if (!await needPerks(message, client)) return;
                        const [member] = splitMember(message, args);
                        const row = first('SELECT embed FROM lastfm WHERE user_id = ?', member.id);
                        if (!row) return lfSend(message, "The member provided doesn't have a **Last.Fm** account connected");
                        return message.reply({
                            embeds: [{
                                color: COLORS.NEUTRAL,
                                title: `${memberName(member)}'s custom lastfm embed`,
                                description: `\`\`\`\n${row.embed || ''}\`\`\``
                            }]
                        });
                    }
                },
                steal: {
                    aliases: [],
                    data: { name: 'lastfm mode steal', description: "Steal someone's lastfm embed", usage: ',lastfm mode steal <member>' },
                    async execute(message, args, client) {
                        if (!await needPerks(message, client)) return;
                        const [member] = splitMember(message, args, true);
                        if (!member) return warn(message, 'Usage: `lastfm mode steal <member>`');
                        if (member.id === message.author.id) return warn(message, "Stealing from yourself doesn't make sense");
                        const row = first('SELECT embed FROM lastfm WHERE user_id = ?', member.id);
                        if (!row) return lfSend(message, "This member doesn't have a custom embed");
                        run('UPDATE lastfm SET embed = ? WHERE user_id = ?', row.embed, message.author.id);
                        return lfSend(message, `Stolen ${member}'s **Last.Fm** custom embed`);
                    }
                }
            }
        },

        reactions: {
            aliases: [],
            data: { name: 'lastfm reactions', description: 'Set custom reactions for the nowplaying command', usage: ',lastfm reactions 🔥 🗑️' },
            async execute(message, args, client, config) {
                const username = getUsername(message.author.id);
                if (!username) return lfSend(message, `You don't have a **Last.fm** account set.\n> Use \`${getPrefix(config)}lastfm set\` to login into your account.`);
                const tokens = args;
                if (!tokens.length) return sendCard(message, module.exports.subs.reactions);
                let reacts;
                if (tokens.length === 1) {
                    if (tokens[0] === 'default') reacts = ['🔥', '🗑️'];
                    else if (tokens[0] === 'none') reacts = [];
                    else reacts = tokens;
                } else {
                    reacts = tokens;
                }
                run('UPDATE lastfm SET reactions = ? WHERE user_id = ?', JSON.stringify(reacts), message.author.id);
                return lfSend(message, `Your **Last.Fm** reactions are set as ${reacts.length ? reacts.join(' ') : 'none'}`);
            }
        },

        spotify: {
            aliases: ['sp'],
            data: { name: 'lastfm spotify', description: 'Look up for your nowplaying lastfm song on spotify', usage: ',lastfm spotify [member]' },
            async execute(message, args) {
                const [member] = splitMember(message, args);
                const check = first('SELECT * FROM lastfm WHERE user_id = ?', member.id);
                if (!check) return lfSend(message, 'There is no **last.fm** account linked for this member');
                const user = check.username;
                const recent = await getTracksRecent(user, 1);
                const tracks = (recent.recenttracks && recent.recenttracks.track) || [];
                if (!tracks.length) return warn(message, "You haven't scrobbled any songs yet");
                const trackName = tracks[0].name;
                const artistName = tracks[0].artist && tracks[0].artist['#text'];
                const queryText = `${trackName} ${artistName}`;
                let data;
                try {
                    const res = await fetch(`https://api.evelina.bot/spotify/track?q=${encodeURIComponent(queryText)}&key=X3pZmLq82VnHYTd6Cr9eAw`);
                    data = await res.json();
                } catch (err) {
                    return warn(message, `Couldn't get information about **${user}**`);
                }
                if (data && data.message) return warn(message, `Couldn't get information about **${user}**`);
                const trackInfo = (data && data.track) || {};
                const url = trackInfo.url || '#';
                return message.reply(url);
            }
        },

        topartists: {
            aliases: ['ta', 'tar'],
            data: { name: 'lastfm topartists', description: 'Get the top artists of a user', usage: ',lastfm topartists [member]' },
            execute: async (message, args) => topList(message, args, 'artists')
        },

        toptracks: {
            aliases: ['tt'],
            data: { name: 'lastfm toptracks', description: 'Get the top tracks of a user', usage: ',lastfm toptracks [member]' },
            execute: async (message, args) => topList(message, args, 'tracks')
        },

        topalbums: {
            aliases: ['tal'],
            data: { name: 'lastfm topalbums', description: 'Get the top albums of a user', usage: ',lastfm topalbums [member]' },
            execute: async (message, args) => topList(message, args, 'albums')
        },

        howto: {
            aliases: [],
            data: { name: 'lastfm howto', description: 'A short guide on how to register your lastfm account', usage: ',lastfm howto' },
            async execute(message, args, client, config) {
                const prefix = getPrefix(config);
                return message.reply({
                    embeds: [{
                        color: COLORS.LASTFM,
                        title: 'Last.fm Tutorial',
                        description: [
                            '1) create an account at [**last.fm**](https://last.fm)',
                            '2) link your **spotify** account to your [**last.fm**](https://www.last.fm/settings/applications) account',
                            `3) use the command \`${prefix}lf set [your lastfm username]\``,
                            `4) while you listen to your songs, you can use the \`${prefix}nowplaying\` command`
                        ].join('\n')
                    }]
                });
            }
        },

        user: {
            aliases: ['ui', 'profile'],
            data: { name: 'lastfm user', description: "Get information about a user's lastfm account", usage: ',lastfm user [member]' },
            async execute(message, args) {
                const [member] = splitMember(message, args);
                const row = first('SELECT username FROM lastfm WHERE user_id = ?', member.id);
                if (!row) {
                    if (member.id === message.author.id) return lfSend(message, "You don't have a **Last.fm** account connected");
                    return lfSend(message, `**${member}** doesn't have a **Last.fm** account connected`);
                }
                const info = await getUserInfo(row.username);
                const i = info.user;
                if (!i) return lfSend(message, "This user doesn't have a **last.fm** account connected");
                try {
                    const image = i.image && i.image[3] && i.image[3]['#text'];
                    return message.reply({
                        embeds: [{
                            color: COLORS.NEUTRAL,
                            title: i.name,
                            url: i.url,
                            thumbnail: image ? { url: image } : undefined,
                            fields: [
                                {
                                    name: 'Plays',
                                    inline: true,
                                    value: `**artists:** ${fmt(i.artist_count)}\n**plays:** ${fmt(i.playcount)}\n**tracks:** ${fmt(i.track_count)}\n**albums:** ${fmt(i.album_count)}`
                                },
                                {
                                    name: 'Info',
                                    inline: true,
                                    value: `**name:** ${i.realname}\n**registered:** <t:${Number(i.registered && i.registered['#text'])}:R>\n**subscriber:** ${i.subscriber === '0' ? 'false' : 'true'}\n**age:** ${fmt(i.age)}`
                                }
                            ]
                        }]
                    });
                } catch (err) {
                    return lfSend(message, "This user doesn't have a **last.fm** account connected");
                }
            }
        },

        whoknows: {
            aliases: ['wk'],
            data: { name: 'lastfm whoknows', description: 'Get the top listeners of a certain artist from the server', usage: ',lastfm whoknows [artist]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'artist', 'guild')
        },

        globalwhoknows: {
            aliases: ['gwk'],
            data: { name: 'lastfm globalwhoknows', description: "Get the top listeners of a certain artist from the server", usage: ',lastfm globalwhoknows [artist]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'artist', 'global')
        },

        whoknowsalbum: {
            aliases: ['wka'],
            data: { name: 'lastfm whoknowsalbum', description: 'Get the top listeners of a certain album from the server', usage: ',lastfm whoknowsalbum [album]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'album', 'guild')
        },

        globalwkalbum: {
            aliases: ['gwka'],
            data: { name: 'lastfm globalwkalbum', description: "Get the top listeners of a certain album from the server", usage: ',lastfm globalwkalbum [album]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'album', 'global')
        },

        whoknowstrack: {
            aliases: ['wkt'],
            data: { name: 'lastfm whoknowstrack', description: 'Get the top listeners of a certain track from the server', usage: ',lastfm whoknowstrack [track]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'track', 'guild')
        },

        globalwktrack: {
            aliases: ['gwkt'],
            data: { name: 'lastfm globalwktrack', description: "Get the top listeners of a certain track from the server", usage: ',lastfm globalwktrack [track]' },
            execute: async (message, args, client, config) => whoKnows(message, args, client, config, 'track', 'global')
        },

        taste: {
            aliases: [],
            data: { name: 'lastfm taste', description: 'Compare your music taste between you and someone else', usage: ',lastfm taste <member>' },
            async execute(message, args, client, config) {
                const [member] = splitMember(message, args, true);
                if (!member) return warn(message, 'Usage: `lastfm taste <member>`');
                const user1 = getUsername(message.author.id);
                const user2 = getUsername(member.id);
                if (!user1) return lfSend(message, `You don't have a **Last.fm** account set. Use \`${getPrefix(config)}lastfm set\` to login to your account.`);
                if (!user2) return lfSend(message, `${member} doesn't have a **Last.fm** account set.`);

                const [data1, data2] = await Promise.all([getTopArtists(user1, 100), getTopArtists(user2, 100)]);
                const map1 = new Map();
                const map2 = new Map();
                for (const artist of ((data1.topartists || {}).artist || [])) map1.set(artist.name, Number(artist.playcount) || 0);
                for (const artist of ((data2.topartists || {}).artist || [])) map2.set(artist.name, Number(artist.playcount) || 0);

                const common = [];
                for (const [name, plays] of map1) {
                    if (map2.has(name)) common.push({ name, one: plays, two: map2.get(name) });
                }
                if (!common.length) return warn(message, `${message.author} and ${member} have no artists in common.`);
                common.sort((a, b) => (b.one + b.two) - (a.one + a.two));

                const artistLines = common.map(entry => entry.name);
                const countLines = common.map(entry => `${fmt(entry.one)} > ${fmt(entry.two)}`);
                const pages = [];
                for (let i = 0; i < artistLines.length; i += 10) {
                    const artistChunk = artistLines.slice(i, i + 10);
                    const countChunk = countLines.slice(i, i + 10);
                    pages.push({
                        [PRESERVE]: true,
                        color: COLORS.NEUTRAL,
                        title: `Taste comparison - ${message.author.username} v ${memberName(member)}`,
                        description: `You both have **${common.length} artists** in common`,
                        author: { name: message.author.username, icon_url: memberAvatar(message.member) },
                        fields: [
                            { name: 'Artists', value: artistChunk.join('\n'), inline: true },
                            { name: 'Play Counts', value: countChunk.join('\n'), inline: true }
                        ],
                        footer: { text: `Page: ${i / 10 + 1}/${Math.ceil(artistLines.length / 10)} (${common.length} entries)` }
                    });
                }
                return sendPages(message, pages);
            }
        },

        cover: {
            aliases: ['image'],
            data: { name: 'lastfm cover', description: 'Get the cover image of your lastfm song', usage: ',lastfm cover [member]' },
            async execute(message, args) {
                const [member] = splitMember(message, args);
                const row = first('SELECT username FROM lastfm WHERE user_id = ?', member.id);
                if (!row) {
                    if (member.id === message.author.id) return lfSend(message, "You don't have a **last.fm** account connected");
                    return lfSend(message, `**${member}** doesn't have a **last.fm** account connected`);
                }
                const username = row.username;
                try {
                    const recent = await getTracksRecent(username, 1);
                    const tracks = (recent.recenttracks && recent.recenttracks.track) || [];
                    const trackInfo = tracks[0];
                    if (!trackInfo || !trackInfo.image) {
                        return warn(message, 'Unexpected response structure from **Last.fm**. Please try again later.');
                    }
                    const imageUrl = (trackInfo.image[3] && trackInfo.image[3]['#text']) || '';
                    if (!imageUrl || !imageUrl.startsWith('http')) {
                        return warn(message, `Could not fetch a image from last.fm API for the track **${trackInfo.name || 'Unknown'}**`);
                    }
                    const res = await fetch(imageUrl);
                    if (!res.ok) return warn(message, 'An error occurred while processing your request');
                    const buffer = Buffer.from(await res.arrayBuffer());
                    return message.reply({
                        content: `**${trackInfo.name}**`,
                        files: [{ attachment: buffer, name: 'cover.png' }]
                    });
                } catch (err) {
                    return warn(message, 'An error occurred while processing your request');
                }
            }
        },

        recent: {
            aliases: [],
            data: { name: 'lastfm recent', description: 'Get the most recent songs of a user', usage: ',lastfm recent [member]' },
            async execute(message, args) {
                const [member] = splitMember(message, args);
                const username = getUsername(member.id);
                if (!username) {
                    if (member.id === message.author.id) return lfSend(message, "You don't have a **last.fm** account connected");
                    return lfSend(message, `**${member}** doesn't have a **last.fm** account connected`);
                }

                let tracks;
                const cacheKey = `lf-recent-${member.id}`;
                const cached = recentCache.get(cacheKey);
                if (cached && Date.now() < cached.expires) {
                    tracks = cached.tracks;
                } else {
                    const recents = await getTracksRecent(username);
                    const raw = (recents.recenttracks && recents.recenttracks.track) || [];
                    const seen = new Set();
                    tracks = [];
                    for (const track of raw) {
                        if (seen.has(track.name)) continue;
                        seen.add(track.name);
                        tracks.push(`[**${track.name}**](https://last.fm/music/${(track.name || '').replace(/ /g, '+')}) by ${(track.artist && track.artist['#text']) || ''}`);
                    }
                    recentCache.set(cacheKey, { tracks, expires: Date.now() + 5 * 60 * 1000 });
                }

                const author = { name: message.author.username, icon_url: memberAvatar(message.member) };
                const lines = tracks.length ? tracks : ['No recent tracks found'];
                return paginateImage(message, lines, `${memberName(member)}'s recent tracks`, author, null);
            }
        },

        playing: {
            aliases: [],
            data: { name: 'lastfm playing', description: 'See what song everyone is listening to in a server', usage: ',lastfm playing' },
            async execute(message) {
                const rows = query('SELECT * FROM lastfm');
                const entries = [];
                for (const row of rows) {
                    const member = message.guild.members.cache.get(row.user_id);
                    if (!member || (member.user && member.user.bot)) continue;
                    entries.push({ username: row.username, name: memberName(member) });
                }

                const results = await Promise.all(entries.map(async (entry) => {
                    try {
                        const recent = await getTracksRecent(entry.username, 1);
                        const tracks = (recent.recenttracks && recent.recenttracks.track) || [];
                        if (!tracks.length) return null;
                        const track = tracks[0];
                        if (!track['@attr'] || !track['@attr'].nowplaying) return null;
                        const artistName = (track.artist && track.artist['#text']) || '';
                        const artistUrl = `https://www.last.fm/music/${artistName.replace(/ /g, '+')}`;
                        return `**${entry.name}** is listening to [**${track.name}**](${track.url}) by [**${artistName}**](${artistUrl})`;
                    } catch (err) {
                        return null;
                    }
                }));

                const lines = results.filter(Boolean);
                if (!lines.length) return warn(message, 'No one is currently listening to a song on last.fm');
                const author = { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
                return paginateImage(message, lines, 'Currently Listening on Last.fm', author, null);
            }
        },

        crowns: {
            aliases: ['crown'],
            data: { name: 'lastfm crowns', description: 'Get users with the most crowns', usage: ',lastfm crowns' },
            async execute(message, args, client) {
                const rows = query('SELECT user_id, COUNT(*) AS crown_count FROM lastfm_crowns GROUP BY user_id ORDER BY crown_count DESC');
                if (!rows.length) return warn(message, 'No crowns have been set yet');
                const lines = [];
                for (const row of rows) {
                    const user = client.users.cache.get(row.user_id);
                    if (user) lines.push(`**${user.username}** has \`${row.crown_count} crowns\``);
                }
                if (!lines.length) return warn(message, 'No crowns have been set yet');
                const author = { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
                return paginateImage(message, lines, 'Users with the most crowns', author, null);
            }
        }
    }
};
