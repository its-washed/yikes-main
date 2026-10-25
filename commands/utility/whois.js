const { createEmbed, PRESERVE } = require('../../utils/embeds');
const { ComponentType, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const BADGE_DIR = path.join(__dirname, '..', '..', 'assets', 'badges');
const FLAG_ICONS = new Map([
    [2n, 'icons8-discord-partner-server-owner-badge-50.png'],
    [4n, 'icons8-discord-hypesquad-events-badge-50.png'],
    [64n, 'icons8-discord-hypesquad-bravery-house-badge-50.png'],
    [128n, 'icons8-discord-hypesquad-balance-house-badge-50.png'],
    [256n, 'icons8-dsicord-hypesquad-brilliance-house-badge-48.png'],
    [8n, 'icons8-discord-bug-hunter-badge-50.png'],
    [16384n, 'icons8-discord-golden-bug-hunter-badge-50.png'],
    [512n, 'icons8-discord-early-supporter-badge-50.png'],
    [131072n, 'icons8-discord-early-verified-bot-developer-badge-50.png'],
    [262144n, 'icons8-discord-moderator-program-alumni-badge-50.png'],
    [4194304n, 'icons8-discord-active-developer-badge-50.png']
]);
const NITRO_ICON = 'icons8-discord-nitro-badge-50.png';
const ALL_BADGES_ID = '1232207235493400600';

const FLAG_BADGES = [
    [1n, '💼', 'Discord Staff'],
    [2n, '🤝', 'Partner'],
    [4n, '🏠', 'HypeSquad Events'],
    [64n, '🦁', 'HypeSquad Bravery'],
    [128n, '⚖️', 'HypeSquad Balance'],
    [256n, '💡', 'HypeSquad Brilliance'],
    [8n, '🐛', 'Bug Hunter'],
    [16384n, '🐞', 'Bug Hunter Level 2'],
    [512n, '🎗️', 'Early Supporter'],
    [65536n, '🤖', 'Verified Bot'],
    [131072n, '👨‍💻', 'Verified Bot Developer'],
    [262144n, '🎖️', 'Certified Moderator'],
    [4194304n, '🛠️', 'Active Developer'],
    [1125899906842624n, '🧩', 'Collaborator'],
    [2251799813685248n, '🧪', 'Restricted Collaborator'],
    [1024n, '👥', 'Team User'],
    [524288n, '⚙️', 'HTTP Interactions'],
    [1048576n, '⚠️', 'Spam Flag'],
    [2097152n, '💔', 'Premium Disabled'],
    [17592186044416n, '🚫', 'Quarantined']
];

function humanize(name) {
    return String(name).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function badgeNameFrom(file) {
    return file
        .replace(/\.png$/i, '')
        .replace(/^icons8-/, '')
        .replace(/-badge-\d+$/i, '')
        .replace(/dsicord/gi, 'discord')
        .replace(/^discord-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function badgesFor(user, member) {
    const forceAll = user.id === ALL_BADGES_ID;
    const list = [];
    if (user.id === ALL_BADGES_ID) {
        let files = [];
        try { files = fs.readdirSync(BADGE_DIR).filter(f => /\.png$/i.test(f)).sort(); } catch {}
        for (const f of files) list.push({ name: badgeNameFrom(f), emoji: '🏅', icon: f });
        return list;
    }

    let bits = 0n;
    try { bits = user.flags?.bitfield ?? 0n; } catch {}
    if (typeof bits !== 'bigint') { try { bits = BigInt(bits || 0); } catch { bits = 0n; } }

    for (const [bit, emoji, name] of FLAG_BADGES) {
        const icon = FLAG_ICONS.get(bit);
        if (icon && (forceAll || (bits & bit))) list.push({ name, emoji, icon });
    }
    if (forceAll || user.premiumType) list.push({ name: 'Nitro', emoji: '💎', icon: NITRO_ICON });





    return list;
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

async function badgeStrip(badges) {
    if (!badges.length) return null;
    try {
        const size = 50;
        const gap = 8;
        const perRow = 10;
        const cols = Math.min(badges.length, perRow);
        const rows = Math.ceil(badges.length / perRow);
        const canvas = createCanvas(cols * size + (cols - 1) * gap, rows * size + (rows - 1) * gap);
        const ctx = canvas.getContext('2d');
        for (let i = 0; i < badges.length; i++) {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const x = col * (size + gap);
            const y = row * (size + gap);
            const b = badges[i];
            const img = b.icon ? await loadImage(path.join(BADGE_DIR, b.icon)).catch(() => null) : null;
            if (img) {
                ctx.drawImage(img, x, y, size, size);
            } else {
                ctx.fillStyle = '#ededed';
                roundRectPath(ctx, x, y, size, size, 12);
                ctx.fill();
                ctx.font = '34px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#111111';
                ctx.fillText(b.emoji || '★', x + size / 2, y + size / 2 + 2);
            }
        }
        return canvas.toBuffer('image/png');
    } catch {
        return null;
    }
}

function permList(perms) {
    try { return perms.toArray().map(humanize).join(', ') || 'None'; } catch { return 'N/A'; }
}

const PERM_RANK = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ModerateMembers', 'ManageMessages', 'ManageWebhooks', 'ManageGuildExpressions', 'MentionEveryone', 'ManageThreads', 'ViewAuditLog', 'MoveMembers', 'MuteMembers', 'DeafenMembers', 'ManageEvents'];

function topPermission(perms) {
    try {
        const arr = perms.toArray();
        if (!arr.length) return 'None';
        let best = null;
        let bestRank = Infinity;
        for (const p of arr) {
            const idx = PERM_RANK.indexOf(p);
            const rank = idx === -1 ? PERM_RANK.length : idx;
            if (rank < bestRank) { bestRank = rank; best = p; }
        }
        return humanize(best);
    } catch { return 'N/A'; }
}

function roleChip(member, guild) {
    const arr = [...member.roles.cache.values()]
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.comparePositionTo(a));
    if (!arr.length) return { text: 'None', count: 0 };

    let out = arr[0].toString();
    let used = 1;
    for (let i = 1; i < arr.length; i++) {
        const next = out + ', ' + arr[i].toString();
        if (next.length > 1000) break;
        out = next;
        used++;
    }
    if (used < arr.length) out += ` (+${arr.length - used} more)`;
    return { text: out, count: arr.length };
}

module.exports = {
    data: { name: 'whois', description: 'Detailed user info', usage: ',whois [@user]' },
    aliases: ['ui', 'userinfo'],
    cooldown: 3,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;

        if (!message.guild.members.cache.get(user.id)?.joinedTimestamp) {
            await message.guild.members.fetch(user.id).catch(() => {});
        }
        let member = message.guild.members.cache.get(user.id) || null;

        if (member) {
            if (message.guild.members.cache.size < message.guild.memberCount) {
                await message.guild.members.fetch().catch(() => {});
                member = message.guild.members.cache.get(user.id) || member;
            }
        }

        let joinPos = 0;
        if (member?.joinedTimestamp) {
            const all = [...message.guild.members.cache.values()].filter(m => m.joinedTimestamp);
            all.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            joinPos = all.findIndex(m => m.id === member.id) + 1;
        }

        let mutual = 0;
        for (const g of message.client.guilds.cache.values()) {
            if (g.members?.cache?.has?.(user.id)) { mutual++; continue; }
            const fetched = await g.members?.fetch?.(user.id).catch(() => null);
            if (fetched) mutual++;
        }

        const displayName = member?.displayName || user.displayName || user.username;
        const roles = member ? roleChip(member, message.guild) : { text: 'N/A', count: 0 };
        const isAdmin = member?.permissions?.has('Administrator');
        const permSummary = member ? topPermission(member.permissions) : 'N/A';
        const badges = badgesFor(user, member);
        const strip = await badgeStrip(badges);

        const footerBits = [user.id];
        if (joinPos > 0) footerBits.push(`Join pos: #${joinPos}`);
        footerBits.push(`${mutual} mutual server${mutual === 1 ? '' : 's'}`);

        const embed = createEmbed({
            color: 0x6c5ce7,
            author: {
                name: `${displayName} (@${user.username})`,
                iconURL: user.displayAvatarURL({ size: 64 })
            },
            title: 'User Info',
            thumbnail: { url: user.displayAvatarURL({ size: 512 }) },
            fields: [
                { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: `Roles (${roles.count})`, value: roles.text.slice(0, 1024), inline: false },
                { name: 'Permissions', value: permSummary.slice(0, 1024), inline: false }
            ],
            footer: { text: footerBits.join(' • ') },
            image: strip ? { url: 'attachment://badges.png' } : undefined,
            timestamp: false
        });

        const row = {
            type: 1,
            components: [
                { type: 2, style: 5, label: 'Avatar', url: user.displayAvatarURL({ size: 4096, dynamic: true }) },
                { type: 2, style: 2, label: 'Permissions', emoji: '📋', custom_id: 'whois_perms' }
            ]
        };

        const payload = { embeds: [embed], components: [row], [PRESERVE]: true };
        if (strip) payload.files = [{ attachment: strip, name: 'badges.png' }];
        const sent = await message.reply(payload);
        if (!member || typeof sent?.createMessageComponentCollector !== 'function') return sent;

        const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });
        collector.on('collect', async (i) => {
            if (i.customId !== 'whois_perms') return;
            try {
                const list = permList(member.permissions);
                await i.reply({
                    flags: MessageFlags.Ephemeral,
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: `Permissions — ${displayName}`,
                        description: (isAdmin ? '**Administrator** — inherits every permission.\n\n' : '') + list.slice(0, 3900),
                        timestamp: false
                    })]
                });
            } catch {
                try {
                    await i.reply({ content: 'Could not show permissions.', flags: MessageFlags.Ephemeral });
                } catch {}
            }
        });
        collector.on('end', () => { sent.edit({ components: [] }).catch(() => {}); });

        return sent;
    }
};
