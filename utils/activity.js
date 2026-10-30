const { first, query, run, transaction } = require('./database');

function buildEntry(row) {
    return {
        messages: Number(row.messages) || 0,
        vcTime: Number(row.vc_time) || 0,
        lastVCJoin: Number(row.last_vc_join) || 0
    };
}

function emptyEntry() {
    return { messages: 0, vcTime: 0, lastVCJoin: 0 };
}

function loadActivity() {
    const guilds = {};
    for (const row of query('SELECT guild_id, user_id, messages, vc_time, last_vc_join FROM activity_stats')) {
        const guildId = String(row.guild_id);
        if (!guilds[guildId]) guilds[guildId] = {};
        guilds[guildId][String(row.user_id)] = buildEntry(row);
    }
    return { guilds };
}

function saveActivity(data) {
    const guilds = (data && data.guilds) || {};
    transaction(() => {
        run('DELETE FROM activity_stats');
        for (const guildId of Object.keys(guilds)) {
            const users = guilds[guildId];
            if (!users || typeof users !== 'object') continue;
            for (const userId of Object.keys(users)) {
                const entry = users[userId] || {};
                run('INSERT INTO activity_stats (guild_id, user_id, messages, vc_time, last_vc_join) VALUES (?, ?, ?, ?, ?)',
                    guildId, userId,
                    Number(entry.messages) || 0,
                    Number(entry.vcTime) || 0,
                    Number(entry.lastVCJoin) || 0);
            }
        }
    });
}

function getUserActivity(guildId, userId) {
    const row = first('SELECT messages, vc_time, last_vc_join FROM activity_stats WHERE guild_id = ? AND user_id = ?', guildId, userId);
    return row ? buildEntry(row) : emptyEntry();
}

function trackMessage(guildId, userId) {
    run('INSERT INTO activity_stats (guild_id, user_id, messages, vc_time, last_vc_join) VALUES (?, ?, 1, 0, 0) ' +
        'ON CONFLICT(guild_id, user_id) DO UPDATE SET messages = messages + 1', guildId, userId);
    return getUserActivity(guildId, userId);
}

function trackVCJoin(guildId, userId) {
    run('INSERT INTO activity_stats (guild_id, user_id, messages, vc_time, last_vc_join) VALUES (?, ?, 0, 0, ?) ' +
        'ON CONFLICT(guild_id, user_id) DO UPDATE SET last_vc_join = excluded.last_vc_join', guildId, userId, Date.now());
    return getUserActivity(guildId, userId);
}

function trackVCLeave(guildId, userId) {
    const current = getUserActivity(guildId, userId);
    if (current.lastVCJoin > 0) {
        const duration = Date.now() - current.lastVCJoin;
        run('INSERT INTO activity_stats (guild_id, user_id, messages, vc_time, last_vc_join) VALUES (?, ?, 0, ?, 0) ' +
            'ON CONFLICT(guild_id, user_id) DO UPDATE SET vc_time = vc_time + excluded.vc_time, last_vc_join = 0',
            guildId, userId, duration);
    }
    return getUserActivity(guildId, userId);
}

function getGuildActivity(guildId) {
    const rows = query('SELECT user_id, messages, vc_time, last_vc_join FROM activity_stats WHERE guild_id = ?', guildId);
    const out = {};
    for (const row of rows) out[String(row.user_id)] = buildEntry(row);
    return out;
}

module.exports = { loadActivity, saveActivity, getUserActivity, trackMessage, trackVCJoin, trackVCLeave, getGuildActivity };
