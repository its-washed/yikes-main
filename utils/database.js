const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
let warnings = {};
let warningsPath = path.join(DATA_DIR, 'warnings.json');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function initDatabase() {
    ensureDataDir();
    try {
        if (fs.existsSync(warningsPath)) {
            const data = fs.readFileSync(warningsPath, 'utf8');
            warnings = JSON.parse(data);
        }
    } catch (error) {
        warnings = {};
    }
}

function saveWarnings() {
    ensureDataDir();
    try {
        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
    } catch (error) {
        console.error('Failed to save warnings:', error);
    }
}

function getWarnings(guildId, userId) {
    if (!warnings[guildId]) warnings[guildId] = {};
    if (!warnings[guildId][userId]) warnings[guildId][userId] = [];
    return warnings[guildId][userId];
}

function addWarning(guildId, userId, moderatorId, reason) {
    if (!warnings[guildId]) warnings[guildId] = {};
    if (!warnings[guildId][userId]) warnings[guildId][userId] = [];

    const warning = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        moderator: moderatorId,
        reason: reason,
        timestamp: new Date().toISOString()
    };

    warnings[guildId][userId].push(warning);
    saveWarnings();
    return warning;
}

function removeWarning(guildId, userId, warningId) {
    if (!warnings[guildId]?.[userId]) return false;

    if (!warningId) {
        warnings[guildId][userId] = [];
        saveWarnings();
        return true;
    }

    const index = warnings[guildId][userId].findIndex(w => w.id === warningId);
    if (index === -1) return false;

    warnings[guildId][userId].splice(index, 1);
    saveWarnings();
    return true;
}

function getWarningCount(guildId, userId) {
    return getWarnings(guildId, userId).length;
}

function closeDatabase() {
    saveWarnings();
}

module.exports = {
    initDatabase,
    closeDatabase,
    getWarnings,
    addWarning,
    removeWarning,
    getWarningCount
};
