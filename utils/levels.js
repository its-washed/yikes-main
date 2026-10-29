const { first, run, query } = require('./database');

const INITIAL_TARGET = Math.trunc(Math.pow(100, 0.9));

function targetXpFor(level) {
    return Math.trunc(Math.pow(100 * level + 1, 0.9));
}

function getLevelData(guildId, userId) {
    const row = first('SELECT xp, level, target_xp FROM level_user WHERE guild_id = ? AND user_id = ?', guildId, userId);
    if (!row) return { level: 0, xp: 0, target_xp: INITIAL_TARGET, totalXp: 0 };
    return { level: row.level || 0, xp: row.xp || 0, target_xp: row.target_xp || INITIAL_TARGET, totalXp: calculateTotalXp(row.level || 0, row.xp || 0) };
}

function getAllLevelData(guildId) {
    const rows = query('SELECT user_id, xp, level, target_xp FROM level_user WHERE guild_id = ?', guildId) || [];
    const out = {};
    for (const row of rows) {
        out[String(row.user_id)] = {
            level: row.level || 0,
            xp: row.xp || 0,
            target_xp: row.target_xp || INITIAL_TARGET,
            totalXp: calculateTotalXp(row.level || 0, row.xp || 0)
        };
    }
    return out;
}

function addXP(guildId, userId, amount) {
    const existing = first('SELECT xp, level, target_xp FROM level_user WHERE guild_id = ? AND user_id = ?', guildId, userId);
    if (!existing) {
        run('INSERT INTO level_user (guild_id, user_id, xp, level, target_xp) VALUES (?, ?, ?, 0, ?)', guildId, userId, amount, INITIAL_TARGET);
        return { leveledUp: false, data: getLevelData(guildId, userId) };
    }
    let xp = (existing.xp || 0) + amount;
    let level = existing.level || 0;
    let target = existing.target_xp || INITIAL_TARGET;
    let leveledUp = false;
    if (xp >= target) {
        level += 1;
        target = targetXpFor(level);
        xp = 0;
        leveledUp = true;
    }
    run('UPDATE level_user SET xp = ?, level = ?, target_xp = ? WHERE guild_id = ? AND user_id = ?', xp, level, target, guildId, userId);
    return { leveledUp, data: { level, xp, target_xp: target } };
}

function setLevelData(guildId, userId, level, xp = 0) {
    const target = targetXpFor(level);
    const existing = first('SELECT 1 AS ok FROM level_user WHERE guild_id = ? AND user_id = ?', guildId, userId);
    if (existing) {
        run('UPDATE level_user SET xp = ?, target_xp = ?, level = ? WHERE guild_id = ? AND user_id = ?', xp, target, level, guildId, userId);
    } else {
        run('INSERT INTO level_user (guild_id, user_id, xp, level, target_xp) VALUES (?, ?, ?, ?, ?)', guildId, userId, xp, level, target);
    }
    return { level, xp, target_xp: target };
}

function resetLevelData(guildId, userId) {
    if (userId) {
        run('DELETE FROM level_user WHERE guild_id = ? AND user_id = ?', guildId, userId);
    } else {
        run('DELETE FROM level_user WHERE guild_id = ?', guildId);
    }
}

function calculateTotalXp(currentLevel, currentXp) {
    let total = 0;
    for (let level = 0; level < currentLevel; level++) {
        total += Math.trunc(Math.pow(100 * level + 1, 0.9));
    }
    return total + Math.trunc(currentXp || 0);
}

async function levelReplace(member, params) {
    let out = String(params || '');
    const row = first('SELECT level, target_xp FROM level_user WHERE guild_id = ? AND user_id = ?', member.guild.id, member.id);
    out = out.replace(/\{level\}/g, String(row ? row.level : 1));
    out = out.replace(/\{target_xp\}/g, String(row ? row.target_xp : 100));
    return out;
}

async function giveRewards(member, level) {
    const guild = member.guild;
    const stackRow = first('SELECT stack FROM leveling WHERE guild_id = ?', guild.id);
    const stack = Boolean(stackRow && stackRow.stack);
    const rows = query('SELECT level, role_id FROM level_rewards WHERE guild_id = ?', guild.id) || [];
    if (!rows.length) return;

    const byLevel = {};
    for (const row of rows) {
        const key = Number(row.level);
        if (!byLevel[key]) byLevel[key] = [];
        byLevel[key].push(String(row.role_id));
    }
    const levels = Object.keys(byLevel).map(Number);
    const allRoleIds = [].concat(...Object.values(byLevel));
    const minLevel = Math.min(...levels);

    if (level < minLevel) {
        const toRemove = member.roles.cache.filter(role => allRoleIds.includes(role.id));
        if (toRemove.size) await member.roles.remove(toRemove, 'Removing level rewards for low-level user').catch(() => {});
        return;
    }

    if (stack) {
        const toAdd = [];
        for (const lvl of levels) {
            if (lvl > level) continue;
            for (const roleId of byLevel[lvl]) {
                const role = guild.roles.cache.get(roleId);
                if (role && !member.roles.cache.has(roleId)) toAdd.push(role);
            }
        }
        if (toAdd.length) await member.roles.add(toAdd, 'Leveled up').catch(() => {});
        return;
    }

    const eligible = levels.filter(lvl => lvl <= level);
    if (!eligible.length) return;
    const highest = Math.max(...eligible);
    const highestRole = guild.roles.cache.get(byLevel[highest][0]);
    const toRemove = member.roles.cache.filter(role => allRoleIds.includes(role.id) && (!highestRole || role.id !== highestRole.id));
    if (toRemove.size) await member.roles.remove(toRemove, 'Leveled up').catch(() => {});
    if (highestRole && !member.roles.cache.has(highestRole.id)) {
        await member.roles.add(highestRole, 'Leveled up').catch(() => {});
    }
}

const syncUserRoles = giveRewards;

module.exports = {
    INITIAL_TARGET,
    targetXpFor,
    getLevelData,
    getAllLevelData,
    addXP,
    setLevelData,
    resetLevelData,
    calculateTotalXp,
    levelReplace,
    giveRewards,
    syncUserRoles
};
