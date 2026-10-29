const { COLORS, EMOJIS } = require('./styles');
const { first } = require('./database');

const ratelimits = new Map();

async function blacklisted(message) {
    const check = first('SELECT reason FROM blacklist_user WHERE user_id = ?', message.author.id);
    if (check) {
        await message.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${message.author.mention}: You are blacklisted from using **${message.client.user}**` }]
        }).catch(() => {});
        return true;
    }
    return false;
}

async function onRatelimit(message) {
    const userId = message.author.id;
    const now = Date.now() / 1000;
    const last = ratelimits.get(userId) || 0;
    if (now < last) {
        await message.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${message.author.mention}: You are on cooldown. Please try again later` }]
        }).catch(() => {});
        return true;
    }
    ratelimits.set(userId, now + 10);
    return false;
}

async function getJson(url, headers) {
    try {
        const res = await fetch(url, headers ? { headers } : {});
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function sendEmbeds(message, embeds) {
    const sent = [];
    for (let i = 0; i < embeds.length; i += 10) {
        const chunk = embeds.slice(i, i + 10);
        sent.push(await message.reply({ embeds: chunk }).catch(() => null));
    }
    return sent;
}

function warnMedia(message, text) {
    return message.reply({
        embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${message.author.mention}: ${text}` }]
    });
}

function humanizeNumber(number) {
    const n = Number(number);
    if (Number.isNaN(n)) return String(number);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { blacklisted, onRatelimit, getJson, warnMedia, humanizeNumber, sendEmbeds };
