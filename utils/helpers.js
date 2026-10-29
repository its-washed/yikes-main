const { PermissionFlagsBits } = require('discord.js');

function parseDuration(str) {
    if (!str) return null;
    const m = str.match(/^(\d+)(s|m|h|d)$/);
    if (!m) return null;

    const amt = parseInt(m[1]);
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return amt * units[m[2]];
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';

    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (d > 0) return `${d}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function parseMember(message, targetId) {
    const mentions = message.mentions.members;
    if (mentions.first()) return mentions.first();
    if (targetId) return message.guild.members.cache.get(targetId);
    return null;
}

function parseChannel(message, channelId) {
    if (!channelId) return null;
    return message.guild.channels.cache.get(channelId.replace(/[<#>]/g, ''));
}

function parseRole(message, roleId) {
    if (!roleId) return null;
    return message.guild.roles.cache.get(roleId.replace(/[<@&>]/g, ''));
}

function resolveRoleInput(message, args = []) {
    const mentioned = message.mentions.roles.first();
    if (mentioned) return { role: mentioned, error: null, query: mentioned.name };

    const typed = args
        .filter(a => !/^<@!?\d+>$/.test(a) && !/^<@&\d+>$/.test(a))
        .join(' ')
        .trim();
    if (!typed) return { role: null, error: null, query: '' };

    const guild = message.guild;
    const name = typed.toLowerCase();
    const exact = guild.roles.cache.filter(r => r.id !== guild.id && r.name.toLowerCase() === name);
    if (exact.size === 1) return { role: exact.first(), error: null, query: typed };
    if (exact.size > 1) return { role: null, error: 'ambiguous', query: typed };

    const partial = guild.roles.cache.filter(r => r.id !== guild.id && r.name.toLowerCase().includes(name));
    if (partial.size === 1) return { role: partial.first(), error: null, query: typed };
    if (partial.size > 1) return { role: null, error: 'ambiguous', query: typed };

    return { role: null, error: 'notfound', query: typed };
}

function hasPermission(member, permissions) {
    if (!Array.isArray(permissions)) permissions = [permissions];
    return permissions.every(p => member.permissions.has(p));
}

function checkHierarchy(executor, target, guild) {
    if (executor.id === guild.ownerId) return true;
    if (target.id === guild.ownerId) return false;
    return executor.roles.highest.position > target.roles.highest.position;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function resolveSubcommand(cmd, args) {
    let node = cmd;
    let depth = 0;
    while (node.subs && depth < args.length) {
        const key = String(args[depth]).toLowerCase();
        const names = Object.keys(node.subs);
        const match = names.find(name => name.toLowerCase() === key) ||
            names.find(name => (node.subs[name].aliases || []).some(alias => String(alias).toLowerCase() === key));
        if (!match) break;
        node = node.subs[match];
        depth++;
    }
    return { handler: node, rest: args.slice(depth) };
}

function humanizeTime(seconds, minimalistic = false, format = null) {
    seconds = Math.floor(seconds || 0);
    if (format === null) {
        const d = Math.floor(seconds / 86400);
        let rem = seconds % 86400;
        const h = Math.floor(rem / 3600);
        rem %= 3600;
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        const parts = [];
        if (d) parts.push(`${d} days`);
        if (h) parts.push(`${h} hours`);
        if (m) parts.push(`${m} minutes`);
        if (s || !parts.length) parts.push(`${s} seconds`);
        let out = parts.join(', ').replace(', and ', ' and ');
        if (minimalistic) {
            out = out.replace(/ days?/g, 'd').replace(/ hours?/g, 'h').replace(/ minutes?/g, 'm').replace(/ seconds?/g, 's');
        }
        return out;
    }
    const hours = Math.floor(seconds / 3600);
    const remainder = seconds % 3600;
    const mins = Math.floor(remainder / 60);
    const secs = remainder % 60;
    const timeParts = [];
    if (format.includes('HH') && hours > 0) timeParts.push(minimalistic ? `${hours.toLocaleString('en-US')}h` : `${hours} hours`);
    if ((format.includes('MM') && mins > 0) || (format.includes('HH') && hours > 0)) timeParts.push(minimalistic ? `${mins.toLocaleString('en-US')}m` : `${mins} minutes`);
    if ((format.includes('SS') && secs > 0) || format.includes('MM') && mins > 0 || format.includes('HH') && hours > 0) timeParts.push(minimalistic ? `${secs.toLocaleString('en-US')}s` : `${secs} seconds`);
    return timeParts.join(' ');
}

function applyDescriptions(root, map) {
    const walk = (node, prefix) => {
        if (!node || typeof node !== 'object') return;
        const own = (node.data && node.data.name) || prefix;
        if (own && map[own]) {
            if (!node.data) node.data = { name: own };
            node.data.description = map[own];
        }
        if (node.subs) {
            for (const [key, child] of Object.entries(node.subs)) {
                walk(child, own ? `${own} ${key}` : key);
            }
        }
    };
    walk(root, root && root.data && root.data.name);
    return root;
}

module.exports = {
    resolveSubcommand,
    applyDescriptions,
    humanizeTime,
    parseDuration,
    formatDuration,
    parseMember,
    parseChannel,
    parseRole,
    resolveRoleInput,
    hasPermission,
    checkHierarchy,
    truncate,
    generateId
};
