const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('./database');
const { createEmbed } = require('./embeds');
const { formatTimespan } = require('./moderation');
const { COLORS } = require('./styles');

function botCanModerate(guild) {
    const me = guild.members.me;
    if (!me) return false;
    return me.permissions.has(PermissionFlagsBits.BanMembers)
        && me.permissions.has(PermissionFlagsBits.KickMembers)
        && me.permissions.has(PermissionFlagsBits.ManageRoles);
}

function isBelowBot(member, botMember) {
    if (!member || !botMember || !member.roles || !member.roles.highest) return false;
    if (member.id === botMember.guild.ownerId) return false;
    if (member.id === botMember.id) return false;
    return member.roles.highest.position < botMember.roles.highest.position;
}

const DANGEROUS = [
    'BanMembers', 'KickMembers', 'MentionEveryone', 'ManageChannels',
    'ManageEvents', 'ManageGuildExpressions', 'ManageGuild', 'ManageRoles',
    'ManageMessages', 'ManageWebhooks', 'ManagePermissions', 'ManageThreads',
    'ModerateMembers', 'MuteMembers', 'DeafenMembers', 'MoveMembers',
    'Administrator'
];

function isDangerous(role) {
    return DANGEROUS.some((perm) => role.permissions.has(PermissionFlagsBits[perm]));
}

function isWhitelisted(row, member) {
    if (!row) return true;
    if (!member) return false;
    if (row.owner_id === member.id) return true;
    if (row.whitelisted && JSON.parse(row.whitelisted).includes(member.id)) return true;
    if (row.admins && JSON.parse(row.admins).includes(member.id)) return true;
    if (row.whitelisted_roles && member.roles) {
        const roles = JSON.parse(row.whitelisted_roles);
        if (member.roles.cache.some((role) => roles.includes(role.id))) return true;
    }
    return false;
}

function fetchConfig(guildId) {
    return first('SELECT owner_id, admins, whitelisted, whitelisted_roles, logs FROM antinuke WHERE guild_id = ?', guildId);
}

function isWhitelistedAsync(guildId, member) {
    return isWhitelisted(fetchConfig(guildId), member);
}

function joinedWhitelist(member) {
    const row = first('SELECT whitelisted FROM antinuke WHERE guild_id = ?', member.guild.id);
    if (!row || !row.whitelisted) return false;
    return JSON.parse(row.whitelisted).includes(member.id);
}

function isModule(module, guildId) {
    return Boolean(first('SELECT 1 AS ok FROM antinuke_modules WHERE module = ? AND guild_id = ?', module, guildId));
}

function getModule(module, guildId) {
    return first('SELECT punishment, threshold FROM antinuke_modules WHERE module = ? AND guild_id = ?', module, guildId);
}

const thresholds = new Map();

function checkThreshold(module, guildId, memberId, threshold) {
    const limit = Number(threshold);
    if (!limit || limit < 0) return true;
    const key = `${module}:${guildId}:${memberId}`;
    const now = Date.now();
    const hits = (thresholds.get(key) || []).filter((t) => now - t <= 60000);
    hits.push(now);
    thresholds.set(key, hits);
    return hits.length > limit;
}

function checkModuleThreshold(module, guildId, memberId) {
    const cfg = getModule(module, guildId);
    if (!cfg) return false;
    return checkThreshold(module, guildId, memberId, Number(cfg.threshold) || 0);
}

async function decidePunishment(module, member, reason, guild) {
    if (member.user.bot) {
        try { await member.kick(reason); } catch (err) {}
        return true;
    }
    const cfg = getModule(module, guild.id);
    const punishment = cfg && cfg.punishment;
    if (punishment === 'ban') {
        try { await member.ban({ reason }); return true; } catch (err) { return false; }
    }
    if (punishment === 'kick') {
        try { await member.kick(reason); return true; } catch (err) { return false; }
    }
    if (punishment === 'strip') {
        const botHighest = guild.members.me.roles.highest;
        const staffRow = first('SELECT staffs FROM antinuke WHERE guild_id = ?', guild.id);
        let rolesToRemove = [];
        if (staffRow && staffRow.staffs) {
            const parsed = JSON.parse(staffRow.staffs);
            if (Array.isArray(parsed) && parsed.length) {
                rolesToRemove = member.roles.cache.filter((role) => parsed.includes(role.id)
                    && !role.managed && role.position < botHighest.position).map((role) => role);
            }
        }
        if (!rolesToRemove.length) {
            rolesToRemove = member.roles.cache.filter((role) => role.editable
                && isDangerous(role) && !role.managed && role.position < botHighest.position).map((role) => role);
        }
        if (!rolesToRemove.length) return false;
        run(`INSERT INTO restore_antinuke (guild_id, user_id, roles)
            VALUES (?, ?, ?) ON CONFLICT (guild_id, user_id) DO UPDATE SET roles = excluded.roles`,
        guild.id, member.id, JSON.stringify(rolesToRemove.map((role) => role.id)));
        try {
            await member.roles.remove(rolesToRemove, reason);
            return true;
        } catch (err) {
            return false;
        }
    }
    return false;
}

async function takeAction(client, action, member, elapsedSeconds, ownerId, channel) {
    const embed = createEmbed({
        color: COLORS.NEUTRAL,
        title: 'User punished',
        description: `**${client.user.name}** took **${formatTimespan(elapsedSeconds)}** to take action`
    });
    if (member && member.guild) {
        embed.setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() });
        embed.addFields({ name: 'Server', value: member.guild.name, inline: true });
        embed.addFields({ name: 'User', value: String(member.user.tag), inline: true });
    }
    embed.addFields({ name: 'Reason', value: action, inline: false });
    if (channel) return channel.send({ embeds: [embed] });
    try {
        const owner = await client.users.fetch(ownerId);
        await owner.send({ embeds: [embed] });
    } catch (err) {}
}

function getLogChannel(guild) {
    const row = first('SELECT owner_id, logs FROM antinuke WHERE guild_id = ?', guild.id);
    if (!row) return { owner_id: guild.ownerId, logs: null };
    return {
        owner_id: row.owner_id || guild.ownerId,
        logs: row.logs ? guild.channels.cache.get(row.logs) : null
    };
}

const auditCache = new Map();
const auditPending = new Set();

async function fetchAuditLog(guild, action, ttl = 5000) {
    const key = `${guild.id}:${action}`;
    const cached = auditCache.get(key);
    if (cached && Date.now() - cached.at < ttl) return cached.entry;
    try {
        const logs = await guild.fetchAuditLogs({ limit: 1, type: action });
        const entry = logs.entries.first() || null;
        auditCache.set(key, { entry, at: Date.now() });
        return entry;
    } catch (err) {
        return null;
    }
}

async function queueAuditLog(guild, action, callback) {
    const key = `${guild.id}:${action}`;
    if (auditPending.has(key)) return;
    auditPending.add(key);
    try {
        const entry = await fetchAuditLog(guild, action);
        if (entry) await callback(entry);
    } catch (err) {
    } finally {
        auditPending.delete(key);
    }
}

async function resolveExecutor(guild, entry) {
    if (!entry || !entry.executor) return null;
    const cached = guild.members.cache.get(entry.executor.id);
    if (cached) return cached;
    try {
        return await guild.members.fetch(entry.executor.id);
    } catch (err) {
        return null;
    }
}

const rateState = new Map();

async function handleRatelimit(guild) {
    const count = (rateState.get(guild.id) || 0) + 1;
    rateState.set(guild.id, count);
    if (count >= 10) {
        rateState.set(guild.id, 0);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return true;
    }
    return false;
}

const flags = new Map();

function claimFlag(key, ttl = 5000) {
    const now = Date.now();
    const expires = flags.get(key);
    if (expires && expires > now) return false;
    flags.set(key, now + ttl);
    return true;
}

module.exports = {
    botCanModerate,
    isBelowBot,
    isDangerous,
    isWhitelisted,
    isWhitelistedAsync,
    joinedWhitelist,
    isModule,
    getModule,
    checkThreshold,
    checkModuleThreshold,
    decidePunishment,
    takeAction,
    getLogChannel,
    fetchAuditLog,
    queueAuditLog,
    resolveExecutor,
    handleRatelimit,
    claimFlag
};
