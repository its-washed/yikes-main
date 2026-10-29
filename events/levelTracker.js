const { Events } = require('discord.js');
const { first, query } = require('../utils/database');
const { getGuildConfig } = require('../utils/config');
const { addXP, giveRewards, levelReplace } = require('../utils/levels');
const { altConvert, scriptPayload } = require('../utils/embedScript');

const cooldowns = new Map();

function parseList(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (err) {
        return [];
    }
}

function onCooldown(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const now = Date.now();
    const bucket = (cooldowns.get(key) || []).filter(t => now - t <= 3000);
    bucket.push(now);
    cooldowns.set(key, bucket);
    return bucket.length > 3;
}

function isTruthy(value) {
    if (value === null || value === undefined) return false;
    const str = String(value).toLowerCase();
    return str !== '' && str !== '0' && str !== 'false' && str !== 'off' && str !== 'none';
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const cfg = first('SELECT * FROM leveling WHERE guild_id = ?', message.guild.id);
        if (!cfg) return;

        if (isTruthy(cfg.command)) {
            const guildCfg = getGuildConfig(message.guild.id);
            const prefix = (guildCfg && guildCfg.prefix) || ',';
            if (message.content.startsWith(prefix)) return;
        }

        if (message.channel.type === 2) return;
        const member = message.member;
        if (!member) return;

        const users = parseList(cfg.users);
        const channels = parseList(cfg.channels);
        const roles = parseList(cfg.roles);
        if (users.includes(member.id)) return;
        if (channels.includes(message.channel.id)) return;
        if (member.roles.cache.some(role => roles.includes(role.id))) return;

        if (onCooldown(message.guild.id, member.id)) return;

        const globalMultiplier = cfg.multiplier != null ? Number(cfg.multiplier) : 1;
        const boosterMultiplier = member.premiumSince && cfg.booster != null ? Number(cfg.booster) : 1;
        const roleIds = member.roles.cache.map(role => role.id);
        let maxRoleMultiplier = 1;
        if (roleIds.length) {
            const roleRows = query(
                `SELECT multiplier FROM level_multiplier WHERE guild_id = ? AND role_id IN (${roleIds.map(() => '?').join(',')})`,
                message.guild.id, ...roleIds) || [];
            for (const row of roleRows) {
                if (row.multiplier != null && Number(row.multiplier) > maxRoleMultiplier) maxRoleMultiplier = Number(row.multiplier);
            }
        }
        const finalMultiplier = Math.max(globalMultiplier, boosterMultiplier, maxRoleMultiplier);
        const xpGain = 4 * finalMultiplier;

        const { leveledUp, data } = addXP(message.guild.id, member.id, xpGain);
        await giveRewards(member, data.level);

        if (!leveledUp) return;

        if (cfg.message && cfg.message !== 'none') {
            let payload = null;
            try {
                const replaced = await levelReplace(member, cfg.message);
                payload = scriptPayload(altConvert(member, replaced));
            } catch (err) {
                payload = null;
            }
            if (payload) {
                if (cfg.channel_id === 0) {
                    member.send(payload).catch(() => {});
                } else {
                    const channel = (cfg.channel_id ? message.guild.channels.cache.get(String(cfg.channel_id)) : null) || message.channel;
                    channel.send(payload).catch(() => {});
                }
            }
        }
        await giveRewards(member, data.level);
    }
};
