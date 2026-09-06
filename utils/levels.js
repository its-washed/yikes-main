const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'levels.json');
let levelData = {};

function ensureData() {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
        if (fs.existsSync(DATA_PATH)) {
            levelData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        }
    } catch { levelData = {}; }
}

function saveData() {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(levelData, null, 2));
    } catch {}
}

function getLevelData(guildId, userId) {
    ensureData();
    if (!levelData[guildId]) levelData[guildId] = {};
    if (!levelData[guildId][userId]) {
        levelData[guildId][userId] = {
            level: 0,
            xp: 0,
            totalXp: 0,
            messages: 0,
            lastXp: 0
        };
    }
    return levelData[guildId][userId];
}

function getAllLevelData(guildId) {
    ensureData();
    return levelData[guildId] || {};
}

function addXP(guildId, userId, amount) {
    const data = getLevelData(guildId, userId);
    const now = Date.now();
    if (now - data.lastXp < 60000) return { leveledUp: false, data };

    data.xp += amount;
    data.totalXp += amount;
    data.messages++;
    data.lastXp = now;

    const xpNeeded = data.level * data.level * 100;
    let leveledUp = false;

    while (data.xp >= xpNeeded) {
        data.xp -= xpNeeded;
        data.level++;
        leveledUp = true;
    }

    saveData();
    return { leveledUp, data };
}

function resetLevelData(guildId, userId) {
    ensureData();
    if (userId) {
        if (levelData[guildId]) delete levelData[guildId][userId];
    } else {
        levelData[guildId] = {};
    }
    saveData();
}

function setLevelData(guildId, userId, level, xp) {
    const data = getLevelData(guildId, userId);
    data.level = level || 0;
    data.xp = xp || 0;
    data.totalXp = level ? level * level * 100 : 0;
    saveData();
    return data;
}

module.exports = { getLevelData, getAllLevelData, addXP, resetLevelData, setLevelData, ensureData };
