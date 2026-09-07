const fs = require('fs');
const path = require('path');

const DEV_FILE = path.join(__dirname, '../../data/developer.json');

function loadDevData() {
    if (!fs.existsSync(DEV_FILE)) return { developers: [], blacklist: [], blacklistedServers: [], globalDisabled: [], serverDisabled: {} };
    const d = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
    if (!d.blacklistedServers) d.blacklistedServers = [];
    if (!d.globalDisabled) d.globalDisabled = [];
    if (!d.serverDisabled) d.serverDisabled = {};
    return d;
}

function saveDevData(data) {
    const dir = path.dirname(DEV_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEV_FILE, JSON.stringify(data, null, 2));
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

function isCommandDisabled(commandName, guildId) {
    const d = loadDevData();
    if (d.globalDisabled.includes(commandName)) return true;
    if (guildId && d.serverDisabled[guildId]?.includes(commandName)) return true;
    return false;
}

module.exports = { loadDevData, saveDevData, isDeveloper, isBlacklisted, isServerBlacklisted, isCommandDisabled };
