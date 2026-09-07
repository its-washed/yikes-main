const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');
let guildConfigs = {};

function ensureDataDir() {
    const d = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadConfigs() {
    ensureDataDir();
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            guildConfigs = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (e) {
        guildConfigs = {};
    }
}

function saveConfigs() {
    ensureDataDir();
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(guildConfigs, null, 2));
    } catch (e) {
        console.error('config save failed:', e);
    }
}

function getGuildConfig(guildId) {
    if (!guildConfigs[guildId]) {
        guildConfigs[guildId] = {
            prefix: ',',
            welcomeChannel: null,
            goodbyeChannel: null,
            logChannel: null,
            autorole: null,
            welcomeMessage: 'Welcome to the server, {user}!',
            goodbyeMessage: 'Goodbye {user}, we will miss you!',
            antispam: { enabled: false, threshold: 5, interval: 10 },
            automod: { enabled: false, words: [], links: false, maxMentions: 5 },
            starboard: { enabled: false, channel: null, threshold: 5 },
            levels: { enabled: true, xpPerMessage: 15, levelUpChannel: null }
        };
    }
    return guildConfigs[guildId];
}

function updateGuildConfig(guildId, updates) {
    const cfg = getGuildConfig(guildId);
    Object.assign(cfg, updates);
    saveConfigs();
    return cfg;
}

loadConfigs();

module.exports = {
    getGuildConfig,
    updateGuildConfig,
    loadConfigs,
    saveConfigs
};
