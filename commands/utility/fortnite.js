const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson, getBytes } = require('../../utils/social');
const { warn } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { COLORS } = require('../../utils/styles');

const AUTH = '344f3f03-718c-4b23-b163-d32605e2072d';

async function stats(message, username, timeWindow) {
    const url = `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(username)}&accountType=epic&timeWindow=${timeWindow}&image=all`;
    const res = await fetch(url, { headers: { Authorization: AUTH } }).catch(() => null);
    if (!res) return warnMedia(message, `Couldn't get information about **${username}**`);
    if (res.status === 401) return warnMedia(message, 'This player has changed their in-game settings to make their profile private :(');
    if (res.status !== 200) return warnMedia(message, `Couldn't get information about **${username}**`);
    const data = await res.json().catch(() => null);
    if (!data || !data.data) return warnMedia(message, `Couldn't get information about **${username}**`);
    return message.reply({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `Fortnite Stats - ${data.data.account.name}`,
            author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
            image: { url: data.data.image }
        }]
    });
}

module.exports = {
    data: { name: 'fortnite', description: 'Fortnite related commands', usage: ',fortnite <lifetime|season|item|shop>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['lifetime', 'season', 'item', 'shop'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: lifetime, season, item, shop');
        return sendCard(message, module.exports);
    },
    subs: {
        lifetime: {
            aliases: [],
            data: { name: 'fortnite lifetime', description: 'Gets lifetime stats on the given fortnite player', usage: ',fortnite lifetime <username>' },
            execute: async (message, args) => {
                const username = args.join(' ').trim();
                if (!username) return warn(message, 'Usage: `fortnite lifetime <username>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                return stats(message, username, 'lifetime');
            }
        },
        season: {
            aliases: [],
            data: { name: 'fortnite season', description: 'Gets season stats on the given fortnite player', usage: ',fortnite season <username>' },
            execute: async (message, args) => {
                const username = args.join(' ').trim();
                if (!username) return warn(message, 'Usage: `fortnite season <username>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                return stats(message, username, 'season');
            }
        },
        item: {
            aliases: [],
            data: { name: 'fortnite item', description: 'Searches for a Fortnite item by name and fetches its details', usage: ',fortnite item <name>' },
            execute: async (message, args) => {
                const cosmetic = args.join(' ').trim();
                if (!cosmetic) return warn(message, 'Usage: `fortnite item <name>`');
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const data = await getJson(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURIComponent(cosmetic)}`);
                if (!data || !data.data) return warnMedia(message, `Couldn't find any item with the name **${cosmetic}**.`);
                const item = data.data;
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: `${item.name} (${item.type.displayValue})`,
                        description: item.description,
                        author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                        thumbnail: { url: item.images.icon },
                        fields: [{
                            name: 'Added to Fortnite',
                            value: `**Chapter:** \`${item.introduction.chapter}\` **Season:** \`${item.introduction.season}\``,
                            inline: false
                        }]
                    }]
                });
            }
        },
        shop: {
            aliases: [],
            data: { name: 'fortnite shop', description: 'Show daily fortnite shop rotation', usage: ',fortnite shop' },
            execute: async (message) => {
                if (await blacklisted(message)) return;
                const now = new Date();
                const url = `https://bot.fnbr.co/shop-image/fnbr-shop-${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}.png`;
                const file = await getBytes(url);
                if (!file) return warnMedia(message, 'Could not fetch the current item shop.');
                return message.reply({ files: [{ attachment: file, name: 'fortnite.png' }] });
            }
        }
    }
};
