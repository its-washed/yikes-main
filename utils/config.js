const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');
let guildConfigs = {};

function ensureDataDir() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function loadConfigs() {
    ensureDataDir();
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            guildConfigs = JSON.parse(data);
        }
    } catch (error) {
        guildConfigs = {};
    }
}

function saveConfigs() {
    ensureDataDir();
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(guildConfigs, null, 2));
    } catch (error) {
        console.error('Failed to save config:', error);
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
    const config = getGuildConfig(guildId);
    Object.assign(config, updates);
    saveConfigs();
    return config;
}

loadConfigs();

module.exports = {
    getGuildConfig,
    updateGuildConfig,
    loadConfigs,
    saveConfigs
};
