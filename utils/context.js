const { warningEmbed, successEmbed, errorEmbed, createEmbed, COLORS, PRESERVE } = require('./embeds');
const { EMOJIS } = require('./styles');
const { Paginator } = require('./pagination');

function warn(message, text) {
    return message.reply({ embeds: [warningEmbed(null, `${EMOJIS.WARNING} ${message.author}: ${text}`)] });
}

function approve(message, text) {
    return message.reply({ embeds: [successEmbed(null, `${EMOJIS.APPROVE} ${message.author}: ${text}`)] });
}

function deny(message, text) {
    return message.reply({ embeds: [errorEmbed(null, `${EMOJIS.DENY} ${message.author}: ${text}`)] });
}

function say(message, text) {
    return message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `${message.author}: ${text}` })] });
}

function parseTime(value) {
    if (value === undefined || value === null || value === '') return null;
    const text = String(value).toLowerCase();
    if (!/^((?:\d+y)?(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?)$/.test(text)) return null;
    const units = { y: 31536000, w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
    let total = 0;
    for (const match of text.matchAll(/(\d+)(y|w|d|h|m|s)/g)) {
        total += Number(match[1]) * units[match[2]];
    }
    return total;
}

function splitPages(lines, perPage, maxChars) {
    const pages = [];
    let current = [];
    let size = 0;
    for (const line of lines) {
        const length = line.length + 1;
        if (current.length >= perPage || (size + length > maxChars && current.length)) {
            pages.push(current);
            current = [];
            size = 0;
        }
        current.push(line);
        size += length;
    }
    if (current.length) pages.push(current);
    return pages.length ? pages : [['Nothing to show']];
}

async function paginate(message, lines, title, author, opts = {}) {
    const items = Array.isArray(lines) ? lines : [String(lines)];
    const chunks = splitPages(items, opts.perPage || 10, opts.maxChars || 3500);
    const total = items.length;
    const pages = [];
    let index = 0;
    for (const chunk of chunks) {
        pages.push({
            [PRESERVE]: true,
            color: COLORS.NEUTRAL,
            title: title || undefined,
            url: opts.url || undefined,
            author: author && author.name ? {
                name: author.name,
                icon_url: author.icon_url || undefined
            } : undefined,
            description: chunk.map(line => `\`${++index}.\` ${line}`).join('\n'),
            thumbnail: opts.image ? { url: opts.image } : undefined,
            footer: { text: `(${total} entries)` }
        });
    }
    const paginator = new Paginator(pages, { userId: message.author.id });
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
    if (pages.length > 1) await paginator.start(message.channel, sent);
    return sent;
}

module.exports = { warn, approve, deny, say, parseTime, paginate, splitPages };
