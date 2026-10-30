const { query, run } = require('./database');

function defaults() {
    return {
        prefix: ',',
        welcomeChannel: null,
        goodbyeChannel: null,
        logChannel: null,
        autorole: null,
        welcomeMessage: 'Welcome to the server, {user}!',
        goodbyeMessage: 'Goodbye {user}, we will miss you!',
        antispam: { enabled: false, threshold: 5, interval: 10 },
        automod: { enabled: false, words: [], links: false, maxMentions: 5 },
        starboard: { enabled: false, channel: null, threshold: 5, emoji: '⭐' },
        levels: { enabled: true, xpPerMessage: 15, levelUpChannel: null }
    };
}

let guildConfigs = {};

function loadConfigs() {
    guildConfigs = {};
    const rows = query('SELECT guild_id, name, value FROM guild_config');
    for (const row of rows) {
        const guildId = String(row.guild_id);
        if (!guildConfigs[guildId]) guildConfigs[guildId] = {};
        try {
            guildConfigs[guildId][row.name] = JSON.parse(row.value);
        } catch (err) {
            guildConfigs[guildId][row.name] = null;
        }
    }
    return guildConfigs;
}

function persistGuild(guildId) {
    const cfg = guildConfigs[guildId];
    if (!cfg) return;
    for (const key of Object.keys(cfg)) {
        const value = cfg[key] === undefined ? null : cfg[key];
        run('INSERT OR REPLACE INTO guild_config (guild_id, name, value) VALUES (?, ?, ?)',
            guildId, key, JSON.stringify(value));
    }
}

function saveConfigs() {
    for (const guildId of Object.keys(guildConfigs)) persistGuild(guildId);
}

function getGuildConfig(guildId) {
    if (!guildConfigs[guildId]) guildConfigs[guildId] = defaults();
    return guildConfigs[guildId];
}

function updateGuildConfig(guildId, updates) {
    const cfg = getGuildConfig(guildId);
    Object.assign(cfg, updates);
    persistGuild(guildId);
    return cfg;
}

loadConfigs();

module.exports = {
    getGuildConfig,
    updateGuildConfig,
    loadConfigs,
    saveConfigs
};
