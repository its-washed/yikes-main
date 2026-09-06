const { PermissionFlagsBits } = require('discord.js');

function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2];

    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return amount * units[unit];
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function parseMember(message, targetId) {
    const mentions = message.mentions.members;
    if (mentions.first()) return mentions.first();

    if (targetId) {
        return message.guild.members.cache.get(targetId);
    }
    return null;
}

function parseChannel(message, channelId) {
    if (!channelId) return null;
    const cleaned = channelId.replace(/[<#>]/g, '');
    return message.guild.channels.cache.get(cleaned);
}

function parseRole(message, roleId) {
    if (!roleId) return null;
    const cleaned = roleId.replace(/[<@&>]/g, '');
    return message.guild.roles.cache.get(cleaned);
}

function hasPermission(member, permissions) {
    if (!Array.isArray(permissions)) permissions = [permissions];
    return permissions.every(perm => member.permissions.has(perm));
}

function checkHierarchy(executor, target, guild) {
    if (executor.id === guild.ownerId) return true;
    if (target.id === guild.ownerId) return false;
    return executor.roles.highest.position > target.roles.highest.position;
}

function truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.slice(0, length - 3) + '...' : str;
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
