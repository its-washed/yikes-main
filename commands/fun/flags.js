const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { addPoints, addLoss } = require('../../utils/gameStats');
const { AttachmentBuilder } = require('discord.js');

const EUROPEAN = [
    'al', 'ad', 'am', 'at', 'az', 'by', 'be', 'ba', 'bg', 'hr',
    'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'ge', 'de', 'gr', 'hu',
    'is', 'ie', 'it', 'kz', 'xk', 'lv', 'li', 'lt', 'lu', 'mt',
    'md', 'mc', 'me', 'nl', 'mk', 'no', 'pl', 'pt', 'ro',
    'ru', 'sm', 'rs', 'sk', 'si', 'es', 'se', 'ch', 'tr', 'ua', 'gb',
    'va'
];

const UNITED_NATIONS = [
    'af', 'al', 'dz', 'ad', 'ao', 'ag', 'ar', 'am', 'au', 'at',
    'az', 'bs', 'bh', 'bd', 'bb', 'by', 'be', 'bz', 'bj', 'bt',
    'bo', 'ba', 'bw', 'br', 'bn', 'bg', 'bf', 'bi', 'cv', 'kh',
    'cm', 'ca', 'cf', 'td', 'cl', 'cn', 'co', 'km', 'cg', 'cd',
    'cr', 'ci', 'hr', 'cu', 'cy', 'cz', 'dk', 'dj', 'dm', 'do',
    'ec', 'eg', 'sv', 'gq', 'er', 'ee', 'sz', 'et', 'fj', 'fi',
    'fr', 'ga', 'gm', 'ge', 'de', 'gh', 'gr', 'gd', 'gt', 'gn',
    'gw', 'gy', 'ht', 'hn', 'hu', 'is', 'in', 'id', 'ir', 'iq',
    'ie', 'il', 'it', 'jm', 'jp', 'jo', 'kz', 'ke', 'ki', 'kp',
    'kr', 'kw', 'kg', 'la', 'lv', 'lb', 'ls', 'lr', 'ly', 'li',
    'lt', 'lu', 'mg', 'mw', 'my', 'mv', 'ml', 'mt', 'mh', 'mr',
    'mu', 'mx', 'fm', 'md', 'mc', 'mn', 'me', 'ma', 'mz', 'mm',
    'na', 'nr', 'np', 'nl', 'nz', 'ni', 'ne', 'ng', 'no', 'om',
    'pk', 'pw', 'pa', 'pg', 'py', 'pe', 'ph', 'pl', 'pt', 'qa',
    'ro', 'ru', 'rw', 'kn', 'lc', 'vc', 'ws', 'sm', 'st', 'sa',
    'sn', 'rs', 'sc', 'sl', 'sg', 'sk', 'si', 'sb', 'so', 'za',
    'ss', 'es', 'lk', 'sd', 'sr', 'se', 'ch', 'sy', 'tw', 'tj',
    'tz', 'th', 'tl', 'tg', 'to', 'tt', 'tn', 'tr', 'tm', 'tv',
    'ug', 'ua', 'ae', 'gb', 'us', 'uy', 'uz', 'vu', 've', 'vn',
    'ye', 'zm', 'zw'
];

const activeGames = new Set();

async function fetchJson(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        return null;
    }
}

async function fetchBytes(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    } catch (err) {
        return null;
    }
}

module.exports = {
    data: { name: 'flags', description: 'Rate your knowledge of flags', usage: ',flags easy solo', params: ['[difficulty]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        const difficulty = String(args[0] || 'easy').toLowerCase();
        const mode = String(args[1] || 'solo').toLowerCase();

        if (activeGames.has(message.author.id)) {
            return warn(message, 'You are already in a game!');
        }
        activeGames.add(message.author.id);

        try {
            const data = await fetchJson('https://cdn.evelina.bot/flags.json');
            if (!data || typeof data !== 'object') {
                return warn(message, "Couldn't fetch country data.");
            }

            let selected;
            let points;
            if (difficulty === 'easy') {
                selected = Object.fromEntries(Object.entries(data).filter(([code]) => EUROPEAN.includes(code)));
                points = 1;
            } else if (difficulty === 'hard') {
                selected = Object.fromEntries(Object.entries(data).filter(([code]) => EUROPEAN.includes(code) || UNITED_NATIONS.includes(code)));
                points = 2;
            } else if (difficulty === 'extreme') {
                selected = data;
                points = 3;
            } else {
                return warn(message, 'Invalid difficulty level. Choose from `easy`, `hard`, `extreme`');
            }

            const codes = Object.keys(selected);
            if (!codes.length) return warn(message, "Couldn't fetch country data.");
            const countryCode = codes[Math.floor(Math.random() * codes.length)];
            const countryName = selected[countryCode];

            const image = await fetchBytes(`https://flagcdn.com/256x192/${countryCode}.png`);
            if (!image) return warn(message, "Couldn't download the flag image.");

            const embed = {
                color: COLORS.NEUTRAL,
                title: `Guess the Flag (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`,
                description: 'What country does this flag belong to?\n> Type `cancel` to surrender',
                thumbnail: { url: 'attachment://flag.png' },
                footer: {
                    text: `Time: 10 Seconds ・ Difficulties: "easy", "hard", "extreme"`,
                    icon_url: 'http://cdn.evelina.bot/flag.png'
                }
            };
            await message.reply({ embeds: [embed], files: [new AttachmentBuilder(image, { name: 'flag.png' })] });

            const attempts = new Map();
            const MAX_ATTEMPTS = 5;
            const filter = m => {
                if (mode === 'solo') return m.author.id === message.author.id && m.channel.id === message.channel.id;
                return m.channel.id === message.channel.id;
            };

            const collector = message.channel.createMessageCollector({ filter, time: 10000 });

            const finish = (lines) => {
                collector.stop();
                return Promise.all(lines);
            };

            let done = false;
            collector.on('collect', async (guess) => {
                if (done) return;
                if (guess.content.toLowerCase() === 'cancel') {
                    done = true;
                    addLoss(message.author.id, 'flags', points);
                    await warn(message, `Game cancelled! The correct answer was **${countryName}**.`);
                    return finish([]);
                }

                const used = attempts.get(guess.author.id) || 0;
                if (used >= MAX_ATTEMPTS) return;

                if (guess.content.toLowerCase() === countryName.toLowerCase()) {
                    done = true;
                    await guess.react('✅').catch(() => {});
                    addPoints(guess.author.id, 'flags', points);
                    await approve(message, `Correct! It is **${countryName}**`);
                    return finish([]);
                }

                await guess.react('❌').catch(() => {});
                attempts.set(guess.author.id, used + 1);
                const remaining = MAX_ATTEMPTS - (used + 1);
                if (remaining > 0) {
                    await warn(message, `Incorrect! **${guess.author.displayLabel || guess.author.username}** has **${remaining}** attempts left`);
                } else {
                    await warn(message, `**${guess.author.displayLabel || guess.author.username}** has used all attempts!`);
                }

                const exhausted = [...attempts.values()].every(count => count >= MAX_ATTEMPTS);
                if (exhausted) {
                    done = true;
                    addLoss(message.author.id, 'flags', points);
                    await warn(message, `All players have used their attempts! The correct answer was **${countryName}**`);
                    finish([]);
                }
            });

            collector.on('end', () => {
                if (!done) {
                    done = true;
                    addLoss(message.author.id, 'flags', points);
                    warn(message, `Time out! The correct answer was **${countryName}**`);
                }
            });
        } finally {
            activeGames.delete(message.author.id);
        }
    }
};
