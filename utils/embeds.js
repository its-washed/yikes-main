const { EmbedBuilder } = require('discord.js');
const { COLORS: PY, EMOJIS } = require('./styles');


const COLORS = {
    NEUTRAL: PY.NEUTRAL,
    SUCCESS: PY.SUCCESS,
    ERROR: PY.ERROR,
    WARNING: PY.WARNING,
    LOADING: PY.LOADING,
    SPOTIFY: PY.SPOTIFY,
    LASTFM: PY.LASTFM,
    primary: PY.NEUTRAL,
    success: PY.SUCCESS,
    error: PY.ERROR,
    warning: PY.WARNING,
    info: PY.NEUTRAL,
    neutral: PY.NEUTRAL
};

function createEmbed(opts = {}) {
    const embed = new EmbedBuilder();

    if (opts.color) embed.setColor(opts.color);
    if (opts.title) embed.setTitle(opts.title);
    if (opts.description) embed.setDescription(opts.description);
    if (opts.author) {
        const author = typeof opts.author === 'string' ? { name: opts.author } : { ...opts.author };
        if (author.icon_url && !author.iconURL) {
            author.iconURL = author.icon_url;
            delete author.icon_url;
        }
        embed.setAuthor(author);
    }
    if (opts.footer) {
        const footer = typeof opts.footer === 'string' ? { text: opts.footer } : { ...opts.footer };
        if (footer.icon_url && !footer.iconURL) {
            footer.iconURL = footer.icon_url;
            delete footer.icon_url;
        }
        embed.setFooter(footer);
    }
    if (opts.thumbnail) embed.setThumbnail(typeof opts.thumbnail === 'string' ? opts.thumbnail : opts.thumbnail.url);
    if (opts.image) embed.setImage(typeof opts.image === 'string' ? opts.image : opts.image.url);
    if (opts.fields) embed.addFields(opts.fields);
    if (opts.timestamp) {
        const stamp = opts.timestamp;
        if (stamp instanceof Date) embed.setTimestamp(stamp);
        else if (typeof stamp === 'number') embed.setTimestamp(stamp);
        else if (typeof stamp === 'string') {
            const parsed = new Date(stamp);
            if (!Number.isNaN(parsed.getTime())) embed.setTimestamp(parsed);
        } else embed.setTimestamp();
    }

    return embed;
}

function successEmbed(title, desc) {
    return createEmbed({ color: COLORS.success, title: title || undefined, description: desc || '' });
}

function errorEmbed(title, desc) {
    const embed = createEmbed({ color: COLORS.error, title: title || undefined, description: desc || '' });
    embed.data[ALERT] = true;
    return embed;
}

function roleInputError(error, query, usage) {
    if (error === 'ambiguous') return errorEmbed('Multiple Roles', `More than one role matches **${query}** \u2014 please ping it instead.`);
    if (error === 'notfound') return errorEmbed('Role Not Found', `No role named **${query}**. Ping the role or type its exact name.`);
    return errorEmbed('Missing Role', `Usage: ${usage}`);
}

function warningEmbed(title, desc) {
    const embed = createEmbed({ color: COLORS.warning, title: title || undefined, description: desc || '' });
    embed.data[ALERT] = true;
    return embed;
}

function infoEmbed(title, desc) {
    return createEmbed({ color: COLORS.info, title: title || undefined, description: desc || '' });
}

function permissionDenied(message, permission, opts = {}) {
    const who = message.author ? `${message.author}` : `${message.user || ''}`.trim();
    const pretty = String(permission || '').split('_').filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || String(permission || '');
    const lead = who ? `${who}: ` : '';
    const need = opts.bot ? `I am **missing** the following permission: \`${pretty}\``
        : `You are **missing** the following permission: \`${pretty}\``;
    const embed = createEmbed({
        color: COLORS.warning,
        description: `${EMOJIS.WARNING} ${lead}${need}`
    });
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
const ACCENT = 0xffd600;

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
    if (/<t:\d+/.test(text)) return text;
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
    const out = {};

    if (typeof data.color === 'number') out.color = data.color;
    if (typeof data.title === 'string') out.title = data.title.slice(0, 256);
    if (typeof data.description === 'string') {
        out.description = data.description.length > 4096
            ? `${data.description.slice(0, 4093)}...`
            : data.description;
    }
    if (typeof data.url === 'string') out.url = data.url;

    if (data.author) {
        if (typeof data.author === 'string') out.author = { name: data.author.slice(0, 256) };
        else if (data.author.name) out.author = { ...data.author, name: String(data.author.name).slice(0, 256) };
    }

    if (Array.isArray(data.fields)) {
        const fields = data.fields
            .filter(field => field && field.name)
            .slice(0, 25)
            .map(field => ({
                name: String(field.name).slice(0, 256),
                value: String(field.value ?? '').slice(0, 1024),
                inline: Boolean(field.inline)
            }));
        if (fields.length) out.fields = fields;
    }

    for (const key of ['image', 'thumbnail']) {
        const value = data[key];
        if (!value) continue;
        if (typeof value === 'string' && /^https?:\/\//.test(value)) out[key] = { url: value };
        else if (value.url) out[key] = { url: value.url };
    }

    if (data.footer) {
        if (typeof data.footer === 'string') out.footer = { text: data.footer.slice(0, 2048) };
        else if (data.footer.text) out.footer = { ...data.footer, text: String(data.footer.text).slice(0, 2048) };
    }

    const stamp = data.timestamp;
    if (typeof stamp === 'number') out.timestamp = stamp;
    else if (typeof stamp === 'string' && !Number.isNaN(new Date(stamp).getTime())) out.timestamp = stamp;

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
    roleInputError,
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
