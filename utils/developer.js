const { query, run, transaction } = require('./database');

function emptyData() {
    return { developers: [], blacklist: [], blacklistedServers: [], globalDisabled: [], serverDisabled: {} };
}

let cache = null;

function loadDevData() {
    if (cache) return cache;
    const data = emptyData();
    for (const row of query('SELECT user_id FROM dev_user')) data.developers.push(String(row.user_id));
    for (const row of query('SELECT user_id FROM dev_blacklist')) data.blacklist.push(String(row.user_id));
    for (const row of query('SELECT guild_id FROM dev_server')) data.blacklistedServers.push(String(row.guild_id));
    for (const row of query('SELECT command FROM dev_disabled')) data.globalDisabled.push(String(row.command));
    for (const row of query('SELECT guild_id, command FROM dev_guild_disabled ORDER BY guild_id')) {
        const guildId = String(row.guild_id);
        if (!data.serverDisabled[guildId]) data.serverDisabled[guildId] = [];
        data.serverDisabled[guildId].push(String(row.command));
    }
    cache = data;
    return data;
}

function saveDevData(data) {
    transaction(() => {
        if (Array.isArray(data.developers)) {
            run('DELETE FROM dev_user');
            for (const id of data.developers) run('INSERT OR IGNORE INTO dev_user (user_id) VALUES (?)', id);
        }
        if (Array.isArray(data.blacklist)) {
            run('DELETE FROM dev_blacklist');
            for (const id of data.blacklist) run('INSERT OR IGNORE INTO dev_blacklist (user_id) VALUES (?)', id);
        }
        if (Array.isArray(data.blacklistedServers)) {
            run('DELETE FROM dev_server');
            for (const id of data.blacklistedServers) run('INSERT OR IGNORE INTO dev_server (guild_id) VALUES (?)', id);
        }
        if (Array.isArray(data.globalDisabled)) {
            run('DELETE FROM dev_disabled');
            for (const name of data.globalDisabled) run('INSERT OR IGNORE INTO dev_disabled (command) VALUES (?)', name);
        }
        if (data.serverDisabled && typeof data.serverDisabled === 'object') {
            run('DELETE FROM dev_guild_disabled');
            for (const guildId of Object.keys(data.serverDisabled)) {
                for (const command of (Array.isArray(data.serverDisabled[guildId]) ? data.serverDisabled[guildId] : [])) {
                    run('INSERT OR IGNORE INTO dev_guild_disabled (guild_id, command) VALUES (?, ?)', guildId, command);
                }
            }
        }
    });
    cache = null;
    return data;
}

function isDeveloper(userId) {
    return loadDevData().developers.includes(userId);
}

function isBlacklisted(userId) {
    return loadDevData().blacklist.includes(userId);
}

function isServerBlacklisted(guildId) {
    return loadDevData().blacklistedServers.includes(guildId);
}

function isCommandDisabled(commandName, guildId, category) {
    const data = loadDevData();
    if (data.globalDisabled.includes(commandName) || (category && data.globalDisabled.includes(category))) return true;
    if (guildId && data.serverDisabled[guildId]?.includes(commandName)) return true;
    return false;
}

module.exports = { loadDevData, saveDevData, isDeveloper, isBlacklisted, isServerBlacklisted, isCommandDisabled };
