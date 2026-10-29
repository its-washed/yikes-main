const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'valorant', description: 'Gets profile information on the given Valorant user', usage: ',valorant <username#tag>' },
    aliases: ['val'],
    cooldown: 5,

    execute: async (message, args) => {
        const username = args.join(' ').trim();
        if (!username) return warn(message, 'Usage: `valorant <username#tag>`');
        if (await blacklisted(message)) return;
        if (await onRatelimit(message)) return;
        if (!username.includes('#')) return warnMedia(message, "Invalid username format. Please use the format 'username#tag'.");
        const [name, tag] = username.split('#');
        const clean = username.replace('#', '%23').replace(/ /g, '%20');
        const data = await getJson(`https://api.henrikdev.xyz/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
        if (!data) return warnMedia(message, `Couldn't get information about **${username}**`);
        if (data.status === 404 || (data.errors && data.errors.length)) {
            return warnMedia(message, data.errors ? data.errors[0].message : `Couldn't get information about **${username}**`);
        }
        if (data.status !== 200) return warnMedia(message, `Couldn't get information about **${username}**`);

        const account = data.data || {};
        const currentLevel = account.account_level;
        let currentRank = 'Unranked';
        let currentElo = '0';
        let currentImage = null;
        let matches = ['No matches found'];

        if (account.region) {
            const mmr = await getJson(`https://api.henrikdev.xyz/valorant/v2/mmr/${encodeURIComponent(account.region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
            if (mmr && mmr.status === 200 && mmr.data && mmr.data.current_data) {
                currentRank = mmr.data.current_data.currenttierpatched || 'Unranked';
                currentElo = String(mmr.data.current_data.ranking_in_tier ?? '0');
                currentImage = (mmr.data.current_data.images || {}).large || null;
            }
            const history = await getJson(`https://api.henrikdev.xyz/valorant/v1/mmr-history/${encodeURIComponent(account.region)}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
            if (history && history.status === 200 && Array.isArray(history.data)) {
                const recent = history.data.slice(0, 5);
                if (recent.length) {
                    matches = recent.map(match =>
                        `<t:${match.date_raw}:R> - **${match.currenttierpatched}** (\`${match.mmr_change_to_last_game}\`)`);
                }
            }
        }

        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                title: username,
                url: `https://tracker.gg/valorant/profile/riot/${clean}/overview`,
                description: `**Account Level:** ${currentLevel}\n**Rank & Elo:** ${currentRank} / ${currentElo}`,
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                thumbnail: currentImage ? { url: currentImage } : undefined,
                fields: [{ name: 'Competitve Matches', value: matches.join('\n'), inline: false }],
                footer: { text: `UID: ${account.puuid}` }
            }]
        });
    }
};
