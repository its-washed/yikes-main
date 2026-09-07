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

module.exports = {
    parseDuration,
    formatDuration,
    parseMember,
    parseChannel,
    parseRole,
    hasPermission,
    checkHierarchy,
    truncate,
    generateId
};
