const fs = require('fs');
const path = require('path');

const DEV_FILE = path.join(__dirname, '../../data/developer.json');

function loadDevData() {
    if (!fs.existsSync(DEV_FILE)) return { developers: [], blacklist: [], blacklistedServers: [], globalDisabled: [], serverDisabled: {} };
    const data = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
    if (!data.blacklistedServers) data.blacklistedServers = [];
    if (!data.globalDisabled) data.globalDisabled = [];
    if (!data.serverDisabled) data.serverDisabled = {};
    return data;
}

function saveDevData(data) {
    const dir = path.dirname(DEV_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEV_FILE, JSON.stringify(data, null, 2));
}

function isDeveloper(userId) {
    const data = loadDevData();
    return data.developers.includes(userId);
}

function isBlacklisted(userId) {
    const data = loadDevData();
    return data.blacklist.includes(userId);
}

function isServerBlacklisted(guildId) {
    const data = loadDevData();
    return data.blacklistedServers.includes(guildId);
}

function isCommandDisabled(commandName, guildId) {
    const data = loadDevData();
    if (data.globalDisabled.includes(commandName)) return true;
    if (guildId && data.serverDisabled[guildId] && data.serverDisabled[guildId].includes(commandName)) return true;
    return false;
}

module.exports = { loadDevData, saveDevData, isDeveloper, isBlacklisted, isServerBlacklisted, isCommandDisabled };
