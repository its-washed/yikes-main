const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { createEmbed, COLORS } = require('./embeds');
const { warn, deny } = require('./context');
const { first, run } = require('./database');

const pools = require('../assets/roleplay-gifs.json');

const NEKOS = {
    kiss: 'kiss',
    hug: 'hug',
    pat: 'pat',
    slap: 'slap',
    cuddle: 'cuddle',
    tickle: 'tickle'
};

let fontsRegistered = false;

function registerFonts() {
    if (fontsRegistered) return;
    fontsRegistered = true;
    try {
        const path = require('path');
        const fs = require('fs');
        const dir = path.join(__dirname, '..', 'assets', 'fonts');
        for (const file of fs.readdirSync(dir)) {
            GlobalFonts.registerFromPath(path.join(dir, file), file.replace(/\.[^.]+$/, ''));
        }
    } catch (err) {
        fontsRegistered = false;
    }
}

async function fetchNekos(tag) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://nekos.life/api/v2/img/${tag}`, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) return null;
        const data = await response.json();
        return data && data.url ? data.url : null;
    } catch (err) {
        return null;
    }
}

async function imageFor(action) {
    const tag = NEKOS[action];
    if (tag) {
        const url = await fetchNekos(tag);
        if (url) return url;
    }
    const pool = pools[action] || [];
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function ordinal(count) {
    const suffix = (count % 100 >= 11 && count % 100 <= 13)
        ? 'th'
        : ({ 1: 'st', 2: 'nd', 3: 'rd' }[count % 10] || 'th');
    return `${count}${suffix}`;
}

async function countFor(authorId, targetId, type) {
    const row = first('SELECT count FROM roleplay WHERE user_id = ? AND target_id = ? AND type = ?', authorId, targetId, type);
    if (!row) {
        run('INSERT INTO roleplay (user_id, target_id, type, count) VALUES (?, ?, ?, 1)', authorId, targetId, type);
        return '1st';
    }
    run('UPDATE roleplay SET count = count + 1 WHERE user_id = ? AND target_id = ? AND type = ?', authorId, targetId, type);
    return ordinal(Number(row.count) + 1);
}

async function resolveMember(message, value) {
    if (!value) return null;
    const raw = String(value);
    const id = raw.replace(/[<@!&>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const mentioned = message.mentions.members.get(id);
        if (mentioned) return mentioned;
        const cached = message.guild.members.cache.get(id);
        if (cached) return cached;
        return message.guild.members.fetch(id).catch(() => null);
    }
    const needle = raw.toLowerCase();
    const matches = message.guild.members.cache.filter(member =>
        member.user.username.toLowerCase() === needle || member.displayName.toLowerCase() === needle);
    if (matches.size === 1) return matches.first();
    return null;
}

function isNsfw(message) {
    return Boolean(message.channel.nsfw);
}

async function act(message, args, client, opts) {
    if (opts.nsfw && !isNsfw(message)) {
        return deny(message, 'This command can only be used in **nsfw** channels');
    }
    const target = await resolveMember(message, args[0]);
    if (!target) {
        return warn(message, `Member **${args[0] || ''}** couldn't be found`);
    }
    if (target.id === message.author.id) {
        return warn(message, opts.self);
    }

    const count = opts.count ? await countFor(message.author.id, target.id, opts.count) : null;
    const image = await imageFor(opts.action);

    return message.reply({
        embeds: [createEmbed({
            color: COLORS.neutral,
            timestamp: false,
            description: opts.text(target, count),
            image: image ? { url: image } : undefined
        })]
    });
}

function getMarriage(userId) {
    return first('SELECT * FROM marry WHERE ? IN (author, soulmate)', userId);
}

function marriagePartner(row, userId) {
    return String(row.author) === String(userId) ? String(row.soulmate) : String(row.author);
}

function insertMarriage(authorId, soulmateId) {
    run('INSERT INTO marry (author, soulmate, timestamp) VALUES (?, ?, ?)', authorId, soulmateId, Date.now() / 1000);
}

function deleteMarriage(userId) {
    run('DELETE FROM marry WHERE ? IN (author, soulmate)', userId);
}

function progressBar(percent) {
    const filled = Math.floor(percent / 8);
    const half = (percent % 8 >= 4) && filled < 12 ? 1 : 0;
    const empty = Math.max(0, 12 - filled - half);
    return `${'█'.repeat(filled)}${half ? '▓' : ''}${'░'.repeat(empty)}`;
}

function drawHeart(ctx, cx, cy, size, color) {
    const unit = size / 100;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(unit, unit);
    ctx.beginPath();
    ctx.arc(-16, -12, 22, 0, Math.PI * 2);
    ctx.arc(16, -12, 22, 0, Math.PI * 2);
    ctx.moveTo(-37, -4);
    ctx.lineTo(37, -4);
    ctx.lineTo(0, 45);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

async function circularImage(ctx, url, x, y, size) {
    try {
        const image = await loadImage(url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(image, x, y, size, size);
        ctx.restore();
        return true;
    } catch (err) {
        return false;
    }
}

async function shipImage(avatarA, avatarB, percent) {
    try {
        registerFonts();
        const width = 281;
        const height = 125;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const left = await circularImage(ctx, avatarA, 0, 0, 125);
        const right = await circularImage(ctx, avatarB, 156, 0, 125);
        if (!left || !right) return null;
        drawHeart(ctx, width / 2, height / 2, 75, percent < 50 ? '#9aa0a6' : '#ff4d6d');
        return canvas.toBuffer('image/png');
    } catch (err) {
        return null;
    }
}

async function certificateImage(nameA, nameB, when) {
    try {
        registerFonts();
        const width = 960;
        const height = 540;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, '#fff1f5');
        background.addColorStop(1, '#ffe1ea');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#ff819f';
        ctx.lineWidth = 6;
        ctx.strokeRect(18, 18, width - 36, height - 36);
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, width - 64, height - 64);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#355482';
        ctx.font = '48px Playfair, serif';
        ctx.fillText('Certificate of Marriage', width / 2, 110);

        drawHeart(ctx, width / 2, 200, 90, '#ff4d6d');

        ctx.font = '40px Playfair, serif';
        ctx.fillStyle = '#355482';
        ctx.fillText(String(nameA), width / 4 + 40, 320);
        ctx.fillText(String(nameB), (width / 4) * 3 - 40, 320);

        ctx.font = '700 34px Playfair, serif';
        ctx.fillText('&', width / 2, 320);

        ctx.fillStyle = '#95918f';
        ctx.font = '24px Satoshi, sans-serif';
        ctx.fillText(when, width / 2, 400);

        ctx.font = '20px Satoshi, sans-serif';
        ctx.fillText('Signed, sealed, delivered', width / 2, 470);

        return canvas.toBuffer('image/png');
    } catch (err) {
        return null;
    }
}

function dateLine(timestamp) {
    const date = new Date(Number(timestamp) * 1000);
    const day = date.getDate();
    const suffix = (day % 100 >= 11 && day % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
    const month = date.toLocaleString('en-US', { month: 'long' });
    return `Got married on the ${day}${suffix} of ${month}, In the year ${date.getFullYear()}`;
}

module.exports = {
    act,
    imageFor,
    countFor,
    resolveMember,
    isNsfw,
    getMarriage,
    marriagePartner,
    insertMarriage,
    deleteMarriage,
    progressBar,
    shipImage,
    certificateImage,
    dateLine
};
