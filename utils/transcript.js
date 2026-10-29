const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'data', 'transcripts');

const BASE = process.env.TRANSCRIPT_URL ? String(process.env.TRANSCRIPT_URL).replace(/\/+$/, '') : null;

function esc(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmtTime(date) {
    return new Date(date).toISOString().replace('T', ' ').slice(0, 19);
}

async function fetchAll(channel) {
    const byId = new Map();
    let before;
    for (let page = 0; page < 10; page++) {
        const batch = await channel.messages.fetch(before ? { limit: 100, before } : { limit: 100 }).catch(() => null);
        if (!batch || !batch.size) break;
        for (const [, msg] of batch) byId.set(msg.id, msg);
        before = batch.last().id;
        if (batch.size < 100) break;
    }
    return [...byId.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function renderMessage(msg) {
    const author = msg.author;
    const avatar = author.avatarURL({ size: 64 }) || author.defaultAvatarURL;
    const parts = [];
    parts.push(`<div class="msg"><img class="avatar" src="${esc(avatar)}" alt="">`);
    parts.push(`<div class="body"><div class="meta"><span class="name">${esc(author.tag)}</span>` +
        `<span class="time">${fmtTime(msg.createdTimestamp)}</span></div>`);
    if (msg.content) {
        const content = esc(msg.content).replace(/\n/g, '<br>');
        parts.push(`<div class="content">${content}</div>`);
    }
    for (const embed of msg.embeds) {
        parts.push(`<div class="embed"><div class="embed-title">${esc(embed.title || '')}</div>` +
            `<div>${esc(embed.description || '').replace(/\n/g, '<br>')}</div></div>`);
    }
    for (const att of msg.attachments.values()) {
        parts.push(`<div class="attachment">📎 <a href="${esc(att.url)}">${esc(att.name)}</a> (${att.size} bytes)</div>`);
    }
    if (msg.system) parts.push(`<div class="content system">${esc(msg.content)}</div>`);
    parts.push('</div></div>');
    return parts.join('');
}

function render(channel, messages, guild) {
    const rows = messages.map(renderMessage).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Transcript - ${esc(channel.name)}</title>
<style>
body{margin:0;background:#2b2d31;color:#dbdee1;font-family:Helvetica,Arial,sans-serif}
.header{padding:16px 20px;background:#1e1f22;border-bottom:1px solid #1f2023;font-size:14px}
.msg{display:flex;gap:12px;padding:8px 20px}
.msg:hover{background:#2e3035}
.avatar{width:40px;height:40px;border-radius:50%}
.meta{display:flex;gap:10px;align-items:baseline}
.name{font-weight:600;color:#f2f3f5}
.time{font-size:11px;color:#949ba4}
.content{font-size:14px;word-wrap:break-word}
.system{color:#949ba4;font-style:italic}
.embed{border-left:4px solid #5865f2;background:#2b2d31;border-radius:4px;padding:8px;margin-top:4px}
.embed-title{font-weight:600;color:#f2f3f5}
.attachment{font-size:13px;margin-top:4px}
a{color:#00a8fc}
</style>
</head>
<body>
<div class="header"><strong>${esc(guild ? guild.name : '')} · #${esc(channel.name)}</strong> — ${messages.length} messages</div>
${rows}
</body>
</html>`;
}

async function makeTranscript(channel) {
    const id = crypto.randomBytes(16).toString('hex');
    try {
        const messages = await fetchAll(channel);
        const html = render(channel, messages, channel.guild);
        const dir = path.join(DIR, id);
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'index.html');
        fs.writeFileSync(file, html, 'utf8');
        return {
            id,
            url: BASE ? `${BASE}/${id}` : null,
            attachment: { attachment: file, name: `${id}.html` }
        };
    } catch (err) {
        return { id, url: null, attachment: null, error: err.message };
    }
}

module.exports = { makeTranscript };
