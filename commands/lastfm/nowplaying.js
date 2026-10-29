const { PermissionFlagsBits } = require('discord.js');
const { warn } = require('../../utils/context');
const { first } = require('../../utils/database');
const { COLORS, EMOJIS } = require('../../utils/styles');
const {
    getUserInfo,
    getTracksRecent,
    getTrackPlaycount,
    lastfmReplacement,
    lfSend
} = require('../../utils/lastfm');
const { altConvert, scriptPayload } = require('../../utils/embedScript');

function splitMember(message, args) {
    const firstArg = args[0];
    if (firstArg !== undefined) {
        const mention = message.mentions.members.first() || message.mentions.users.first();
        if (mention) return [mention, args.slice(1)];
        const match = /^(\d{17,20})$/.exec(String(firstArg).trim());
        if (match) {
            const member = message.guild.members.cache.get(match[1]);
            if (member) return [member, args.slice(1)];
        }
    }
    return [message.member || message.author, args];
}

function withTimeout(promise, ms) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
        })
    ]).finally(() => clearTimeout(timer));
}

async function execute(message, args, client, config) {
    try {
        const [member] = splitMember(message, args);
        const self = member.id === message.author.id;
        const check = first('SELECT username, reactions, embed, reply FROM lastfm WHERE user_id = ?', member.id);
        if (!check) {
            if (self) return lfSend(message, "You don't have a **Last.Fm** account connected");
            return lfSend(message, `**${member}** doesn't have a **Last.Fm** account connected`);
        }
        const user = check.username;

        let mes;
        if (check.embed) {
            const payload = scriptPayload(altConvert(message.member, await lastfmReplacement(user, check.embed)));
            if (!payload.content && !payload.embeds) payload.content = check.embed;
            try {
                mes = await message.reply({ ...payload, allowedMentions: { repliedUser: false } });
            } catch (err) {
                mes = await message.channel.send(payload);
            }
        } else {
            let a;
            let u;
            try {
                [a, u] = await Promise.all([
                    withTimeout(getTracksRecent(user, 1), 15000),
                    withTimeout(getUserInfo(user), 15000)
                ]);
            } catch (err) {
                if (err.message === 'timeout') {
                    return warn(message, 'Could not connect to LastFM servers. Please try again later');
                }
                return warn(message, `An unexpected error occurred: ${err.message}`);
            }
            const tracks = (a.recenttracks && a.recenttracks.track) || [];
            if (!tracks.length) return warn(message, 'No recent tracks found');

            const firstTrack = tracks[0];
            const album = (firstTrack.album && firstTrack.album['#text']) || 'Unknown album';
            const trackName = firstTrack.name || 'Unknown track';
            const artistName = (firstTrack.artist && firstTrack.artist['#text']) || 'Unknown artist';
            const playcount = await getTrackPlaycount(user, firstTrack);
            const totalScrobbles = (a.recenttracks['@attr'] && a.recenttracks['@attr'].total) || 0;
            const userIcon = u.user && u.user.image && u.user.image[2] && u.user.image[2]['#text'];
            const trackImage = firstTrack.image && firstTrack.image[2] && firstTrack.image[2]['#text'];

            const embed = {
                color: COLORS.NEUTRAL,
                author: { name: user, url: `https://last.fm/user/${user}`, icon_url: userIcon || undefined },
                thumbnail: trackImage ? { url: trackImage } : undefined,
                fields: [
                    { name: 'Track', value: `[**${trackName}**](https://last.fm/music/${trackName.replace(/ /g, '+')})`, inline: true },
                    { name: 'Artist', value: `[**${artistName}**](https://last.fm/artist/${artistName.replace(/ /g, '+')})`, inline: true }
                ],
                footer: { text: `Playcount: ${playcount} ∙ Total Scrobbles: ${totalScrobbles}${album ? ` ∙ Album: ${album}` : ''}` }
            };
            mes = await message.reply({ embeds: [embed] });
        }

        if (check.reactions && message.guild.members.me &&
            message.guild.members.me.permissions.has(PermissionFlagsBits.AddReactions)) {
            let reactions = [];
            try {
                const parsed = JSON.parse(check.reactions);
                if (Array.isArray(parsed)) reactions = parsed;
            } catch (err) {}
            for (const reaction of reactions) {
                await mes.react(reaction).catch(() => {});
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        return mes;
    } catch (err) {
        if (err.message === 'No recent tracks') return warn(message, "You haven't scrobbled any songs yet");
        return warn(message, `An unexpected error occurred: ${err.message}`);
    }
}

module.exports = {
    data: {
        name: 'nowplaying',
        description: 'Get the latest song scrobbled on Last.Fm',
        usage: ',nowplaying [member]'
    },
    aliases: ['np', 'fm'],
    cooldown: 3,

    execute
};
