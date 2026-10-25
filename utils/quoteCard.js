const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

function reg(file, alias) {
    const p = path.join(FONT_DIR, file);
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, alias);
}

reg('Satoshi-Regular.ttf', 'Satoshi');
reg('Satoshi-Medium.ttf', 'Satoshi');
reg('Satoshi-Bold.ttf', 'Satoshi');
reg('Satoshi-Black.ttf', 'Satoshi');
reg('Inter.ttf', 'Inter');
reg('Playfair.ttf', 'Playfair');

const windir = process.env.windir || 'C:\\Windows';
const emojiPath = path.join(windir, 'Fonts', 'seguiemj.ttf');
if (fs.existsSync(emojiPath)) GlobalFonts.registerFromPath(emojiPath);

const FONTS = {
    satoshi: { key: 'satoshi', label: 'Satoshi', family: 'Satoshi' },
    inter: { key: 'inter', label: 'Inter', family: 'Inter' },
    playfair: { key: 'playfair', label: 'Playfair', family: 'Playfair' }
};

const COLORS = {
    white: { key: 'white', label: 'White', bg: '#16161a', text: '#ffffff', sub: '#9b9ba3', glyph: '#4b4c55', avatarBg: '#2a2b31', border: 'rgba(255,255,255,0.06)' },
    gray: { key: 'gray', label: 'Gray', bg: '#16161a', text: '#b9bbc4', sub: '#7d7f89', glyph: '#3c3d44', avatarBg: '#26272c', border: 'rgba(255,255,255,0.05)' },
    yellow: { key: 'yellow', label: 'Yellow', bg: '#16161a', text: '#fbbf24', sub: '#b69b3f', glyph: '#4a4126', avatarBg: '#2e2a1e', border: 'rgba(251,191,36,0.14)' }
};

const STYLES = {
    wide: { key: 'wide', label: 'Classic (wide)', w: 860, h: 360 },
    classic: { key: 'classic', label: 'Classic', w: 640, h: 360 },
    compact: { key: 'compact', label: 'Compact', w: 720, h: 200 }
};

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function coverDraw(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * 0.3, dw, dh);
}

function truncate(ctx, text, maxW) {
    let s = String(text);
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
}

function wrapLines(ctx, text, maxW, maxLines) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines = [];
    let cur = '';
    let i = 0;
    let truncated = false;
    for (; i < words.length; i++) {
        const w = words[i];
        const trial = cur ? cur + ' ' + w : w;
        if (ctx.measureText(trial).width <= maxW) { cur = trial; continue; }
        if (cur) {
            lines.push(cur);
            cur = '';
            if (lines.length >= maxLines) { truncated = true; break; }
        }
        if (ctx.measureText(w).width <= maxW) { cur = w; continue; }
        let chunk = '';
        for (const ch of w) {
            if (ctx.measureText(chunk + ch).width <= maxW) { chunk += ch; continue; }
            lines.push(chunk);
            chunk = ch;
            if (lines.length >= maxLines) break;
        }
        if (lines.length >= maxLines) { truncated = true; break; }
        cur = chunk;
    }
    if (!truncated && cur) {
        if (lines.length < maxLines) lines.push(cur);
        else truncated = true;
    }
    if (truncated && lines.length) {
        let last = lines[lines.length - 1];
        while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
        lines[lines.length - 1] = last + '…';
    }
    return lines;
}

function drawAvatarCircle(ctx, img, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (img) coverDraw(ctx, img, cx - r, cy - r, r * 2, r * 2);
    else { ctx.fillStyle = color; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
    ctx.restore();
}

async function renderQuoteCard({ text, displayName, username, avatar, font, color, style }) {
    const F = FONTS[font] || FONTS.satoshi;
    const C = COLORS[color] || COLORS.white;
    const S = STYLES[style] || STYLES.wide;

    const W = S.w;
    const H = S.h;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    let img = null;
    if (avatar) {
        try {
            let src = avatar;
            if (typeof src === 'string' && /^https?:\/\//.test(src)) {
                const res = await fetch(src);
                src = Buffer.from(await res.arrayBuffer());
            }
            img = await loadImage(src);
        } catch { img = null; }
    }

    roundRectPath(ctx, 0, 0, W, H, 18);
    ctx.fillStyle = C.bg;
    ctx.fill();
    ctx.save();
    ctx.clip();

    const nameText = '— ' + String(displayName || '');
    const handleText = '@' + String(username || '');

    if (S.key === 'wide') {
        const panelW = 470;
        if (img) coverDraw(ctx, img, 0, 0, panelW, H);
        else { ctx.fillStyle = C.avatarBg; ctx.fillRect(0, 0, panelW, H); }

        const tx = panelW + 36;
        const tw = W - tx - 34;

        ctx.fillStyle = C.glyph;
        ctx.font = `96px ${F.family}`;
        ctx.fillText('“', tx, 106);

        ctx.fillStyle = C.text;
        ctx.font = `500 32px ${F.family}`;
        const lines = wrapLines(ctx, text, tw, 3);
        lines.forEach((l, i) => ctx.fillText(l, tx, 172 + i * 42));

        ctx.fillStyle = C.text;
        ctx.font = `bold 26px ${F.family}`;
        ctx.fillText(truncate(ctx, nameText, tw), tx, 292);

        ctx.fillStyle = C.sub;
        ctx.font = `20px ${F.family}`;
        ctx.fillText(truncate(ctx, handleText, tw), tx, 326);
    } else if (S.key === 'classic') {
        const r = 78;
        const cx = 44 + r;
        const cy = H / 2;
        drawAvatarCircle(ctx, img, cx, cy, r, C.avatarBg);

        const tx = cx + r + 34;
        const tw = W - tx - 32;

        ctx.fillStyle = C.glyph;
        ctx.font = `84px ${F.family}`;
        ctx.fillText('“', tx, 100);

        ctx.fillStyle = C.text;
        ctx.font = `500 30px ${F.family}`;
        const lines = wrapLines(ctx, text, tw, 3);
        lines.forEach((l, i) => ctx.fillText(l, tx, 162 + i * 40));

        ctx.fillStyle = C.text;
        ctx.font = `bold 26px ${F.family}`;
        ctx.fillText(truncate(ctx, nameText, tw), tx, 292);

        ctx.fillStyle = C.sub;
        ctx.font = `20px ${F.family}`;
        ctx.fillText(truncate(ctx, handleText, tw), tx, 326);
    } else {
        const r = 52;
        const cx = 34 + r;
        const cy = H / 2;
        drawAvatarCircle(ctx, img, cx, cy, r, C.avatarBg);

        const tx = cx + r + 28;
        const tw = W - tx - 30;

        ctx.fillStyle = C.text;
        ctx.font = `500 28px ${F.family}`;
        const lines = wrapLines(ctx, text, tw, 2);
        lines.forEach((l, i) => ctx.fillText(l, tx, 64 + i * 36));

        ctx.fillStyle = C.text;
        ctx.font = `bold 24px ${F.family}`;
        ctx.fillText(truncate(ctx, nameText, tw), tx, 150);

        ctx.fillStyle = C.sub;
        ctx.font = `18px ${F.family}`;
        ctx.fillText(truncate(ctx, handleText, tw), tx, 180);
    }

    ctx.restore();

    roundRectPath(ctx, 1, 1, W - 2, H - 2, 17);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.toBuffer('image/png');
}

const SELECTS = [
    { id: 'quote_font', key: 'font', map: FONTS },
    { id: 'quote_color', key: 'color', map: COLORS },
    { id: 'quote_style', key: 'style', map: STYLES }
];

function buildRows(state) {
    return SELECTS.map(sel => {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(sel.id)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(Object.values(sel.map).map(o => ({
                label: o.label,
                value: o.key,
                default: state[sel.key] === o.key
            })));
        return new ActionRowBuilder().addComponents(menu);
    });
}

async function sendQuoteCard(message, { text, displayName, username, avatarUrl }) {
    const state = { font: 'satoshi', color: 'white', style: 'wide' };
    const build = () => renderQuoteCard({ text, displayName, username, avatar: avatarUrl, ...state });

    const sent = await message.reply({
        files: [{ attachment: await build(), name: 'quote.png' }],
        components: buildRows(state)
    });

    const collector = sent.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000
    });

    collector.on('collect', async (i) => {
        const sel = SELECTS.find(s => s.id === i.customId);
        if (!sel || !i.values?.length) return;
        if (!sel.map[i.values[0]]) return;
        state[sel.key] = i.values[0];
        try {
            const buf = await build();
            await i.update({
                attachments: [],
                files: [{ attachment: buf, name: 'quote.png' }],
                components: buildRows(state)
            });
        } catch {
            await i.update({ components: buildRows(state) }).catch(() => {});
        }
    });

    collector.on('end', () => {
        sent.edit({ components: [] }).catch(() => {});
    });

    return sent;
}

module.exports = { renderQuoteCard, sendQuoteCard, FONTS, COLORS, STYLES };
