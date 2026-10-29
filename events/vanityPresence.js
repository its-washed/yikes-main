const { Events, ActivityType } = require('discord.js');
const { query } = require('../utils/database');
const { altConvert, scriptPayload } = require('../utils/embedScript');

const guildConfigs = new Map();
const memberCache = new Map();
const cooldownCache = new Map();
const ALERT_COOLDOWN = 30;
let loaded = false;

function reload() {
    guildConfigs.clear();
    const rows = query('SELECT * FROM vanity');
    for (const row of rows) {
        let roles = [];
        if (typeof row.roles === 'string') {
            try {
                const parsed = JSON.parse(row.roles || '[]');
                roles = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch {
                roles = [];
            }
        } else if (Array.isArray(row.roles)) {
            roles = row.roles.map(String);
        }
        guildConfigs.set(String(row.guild_id), {
            channel_id: row.channel_id,
            roles,
            message: row.message,
            trigger: row.trigger ? String(row.trigger).toLowerCase() : null
        });
    }
    loaded = true;
}

function checkCooldown(guildId, memberId) {
    const now = Date.now() / 1000;
    if (!cooldownCache.has(guildId)) cooldownCache.set(guildId, new Map());
    const guildCooldowns = cooldownCache.get(guildId);
    const lastAlert = guildCooldowns.get(memberId) || 0;
    if (now - lastAlert >= ALERT_COOLDOWN) {
        guildCooldowns.set(memberId, now);
        return true;
    }
    return false;
}

async function sendAlert(member, config) {
    if (!config.message || !config.channel_id) return;
    const channel = member.guild.channels.cache.get(String(config.channel_id));
    if (!channel) return;
    try {
        const payload = scriptPayload(altConvert(member, config.message));
        await channel.send(payload);
    } catch {
    }
}

module.exports = {
    name: Events.PresenceUpdate,
    once: false,

    async execute(before, after) {
        if (!loaded) reload();
        const member = after && after.member;
        if (!member || !member.guild) return;
        const config = guildConfigs.get(String(member.guild.id));
        if (!config) return;
        const rewardRoles = config.roles;
        if (!rewardRoles.length && !config.trigger) return;

        if (after.status === 'offline') {
            const memberRoleIds = new Set(member.roles.cache.map(r => r.id));
            const toRemove = rewardRoles.filter(id => memberRoleIds.has(id));
            if (toRemove.length) {
                await member.roles.remove(toRemove, '[Vanity] User went offline/invisible').catch(() => {});
            }
            memberCache.set(member.id, false);
            return;
        }

        const vanityLink = config.trigger;
        const hasVanity = vanityLink
            ? (after.activities || []).some(a => a.type === ActivityType.Custom && a.name && a.name.toLowerCase().includes(vanityLink))
            : false;
        const hadVanity = memberCache.get(member.id, false);
        if (hadVanity === hasVanity) return;
        memberCache.set(member.id, hasVanity);

        const memberRoleIds = new Set(member.roles.cache.map(r => r.id));
        if (hasVanity) {
            const toAdd = rewardRoles.filter(id => !memberRoleIds.has(id));
            if (toAdd.length) {
                await member.roles.add(toAdd, '[Vanity] User has vanity link in status').catch(() => {});
            }
            if (checkCooldown(member.guild.id, member.id)) {
                await sendAlert(member, config);
            }
        } else {
            const toRemove = rewardRoles.filter(id => memberRoleIds.has(id));
            if (toRemove.length) {
                await member.roles.remove(toRemove, '[Vanity] User removed vanity link from status').catch(() => {});
            }
            memberCache.set(member.id, false);
        }
    }
};

module.exports.reload = reload;
