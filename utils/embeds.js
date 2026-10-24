const { EmbedBuilder } = require('discord.js');

const COLORS = {
    primary: 0x6c5ce7,
    success: 0x00d26a,
    error: 0xff4757,
    warning: 0xffa502,
    info: 0x74b9ff,
    neutral: 0x2f3542
};

function createEmbed(opts = {}) {
    const embed = new EmbedBuilder();

    if (opts.color) embed.setColor(opts.color);
    if (opts.title) embed.setTitle(opts.title);
    if (opts.description) embed.setDescription(opts.description);
    if (opts.author) embed.setAuthor(opts.author);
    if (opts.footer) embed.setFooter(opts.footer);
    if (opts.thumbnail) embed.setThumbnail(opts.thumbnail);
    if (opts.image) embed.setImage(opts.image);
    if (opts.fields) embed.addFields(opts.fields);
    if (opts.timestamp !== false) embed.setTimestamp();

    return embed;
}

function successEmbed(title, desc) {
    return createEmbed({ color: COLORS.success, title: title || 'Success', description: desc || '' });
}

function errorEmbed(title, desc) {
    const embed = createEmbed({ color: COLORS.error, title: title || 'Error', description: desc || '' });
    embed.data[ALERT] = true;
    return embed;
}

function warningEmbed(title, desc) {
    const embed = createEmbed({ color: COLORS.warning, title: title || 'Warning', description: desc || '' });
    embed.data[ALERT] = true;
    return embed;
}

function infoEmbed(title, desc) {
    return createEmbed({ color: COLORS.info, title: title || 'Info', description: desc || '' });
}

function permissionDenied(message, permission, opts = {}) {
    const who = message.author ? `${message.author}` : `${message.user || ''}`.trim();
    const pretty = String(permission || '').split('_').filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || String(permission || '');
    const need = opts.bot ? 'I need' : 'you need';
    const lead = who ? `${who}, ` : '';
    const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setDescription(`${lead}${need} the **${pretty}** permission to do that.`);
    embed.data[ALERT] = true;
    return embed;
}

function modLogEmbed(action, mod, target, reason, color) {
    return createEmbed({
        color: color || COLORS.warning,
        title: `Mod: ${action}`,
        fields: [
            { name: 'Moderator', value: `${mod.tag} (${mod.id})`, inline: true },
            { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Reason', value: reason || 'None provided', inline: false }
        ]
    });
}

const PRESERVE = Symbol('preserveEmbed');
const ALERT = Symbol('alertEmbed');
const ACCENT = 0xfbbf24;

function toPlain(embed) {
    if (!embed) return {};
    if (embed.data) return { ...embed.data };
    if (typeof embed.toJSON === 'function') return { ...embed.toJSON() };
    return { ...embed };
}

function monoValue(value) {
    const text = String(value ?? '');
    if (!text || text.length > 120 || text.includes('\n')) return text;
    if (/<@|<#|<@&|https?:|```|\*\*/.test(text)) return text;
    const prose = /\s/.test(text) || !/[_,./#:@\-]/.test(text);
    return prose ? text : `\`${text}\``;
}

function pluralize(word, n) {
    if (n === 1) return word;
    if (/(?:s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    return `${word}s`;
}

function tidyPart(text) {
    return text
        .replace(/\*\*(\d+)\*\* ([A-Za-z]+)\(s\)/g, (m, n, w) => `**${n}** ${pluralize(w, Number(n))}`)
        .replace(/\b(\d+) ([A-Za-z]+)\(s\)/g, (m, n, w) => `${n} ${pluralize(w, Number(n))}`)
        .replace(/\b([A-Za-z]+)\(s\)/g, (m, w) => pluralize(w, 2));
}

function tidyGrammar(text) {
    return String(text)
        .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
        .map((part, i) => (i % 2 ? part : tidyPart(part)))
        .join('');
}

function flattenEmbed(embed) {
    const data = toPlain(embed);

    const alreadyFlattened = data.color === ACCENT && !data.title && !data.fields &&
        typeof data.description === 'string' && Boolean(data.description);
    if (alreadyFlattened) return data;

    const alert = Boolean(data[ALERT]);

    const parts = [];
    if (data.title) parts.push(`**${data.title}**`);
    if (data.description) parts.push(String(data.description).replace(/^\n+/, ''));

    const fieldLines = [];
    for (const field of data.fields || []) {
        if (!field || !field.name) continue;
        fieldLines.push(`**${field.name}** — ${monoValue(field.value)}`);
    }
    if (fieldLines.length) parts.push(fieldLines.join('\n'));

    const out = { color: ACCENT };
    if (parts.length) {
        let description = tidyGrammar(parts.join('\n\n'));
        if (alert) description = `⚠ ${description}`;
        if (description.length > 4096) description = `${description.slice(0, 4093)}...`;
        out.description = description;
    }
    if (alert) out[ALERT] = true;
    if (data.author && data.author.name) out.author = data.author;
    if (data.timestamp) {
        out.timestamp = data.timestamp instanceof Date
            ? data.timestamp.toISOString()
            : typeof data.timestamp === 'boolean'
                ? new Date().toISOString()
                : data.timestamp;
    }
    if (data.thumbnail && data.thumbnail.url) out.thumbnail = data.thumbnail;
    if (data.image && data.image.url) out.image = data.image;
    if (data.footer && data.footer.text) out.footer = data.footer;
    return out;
}

function normalizePayload(payload) {
    if (!payload || payload[PRESERVE]) return payload;
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) return payload;
    if (!payload.embeds || !payload.embeds.length) return payload;
    return { ...payload, embeds: payload.embeds.map(flattenEmbed) };
}

function wrapReply(message) {
    const rawReply = message.reply.bind(message);
    message.reply = async payload => {
        const sent = await rawReply(normalizePayload(payload));
        if (sent && typeof sent.edit === 'function') {
            const rawEdit = sent.edit.bind(sent);
            sent.edit = p => Promise.resolve(rawEdit(normalizePayload(p)));
        }
        return sent;
    };
    return () => {
        message.reply = rawReply;
    };
}

module.exports = {
    COLORS,
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    modLogEmbed,
    permissionDenied,
    tidyGrammar,
    PRESERVE,
    ALERT,
    ACCENT,
    flattenEmbed,
    normalizePayload,
    wrapReply
};
