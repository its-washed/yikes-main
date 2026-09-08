const fs = require('fs');
const path = require('path');

const ACTIVITY_FILE = path.join(__dirname, '..', '..', 'data', 'activity.json');

function loadActivity() {
    if (!fs.existsSync(ACTIVITY_FILE)) return { guilds: {} };
    return JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
}

function saveActivity(data) {
    const dir = path.dirname(ACTIVITY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2));
}

function getUserActivity(guildId, userId) {
    const data = loadActivity();
    if (!data.guilds[guildId]) data.guilds[guildId] = {};
    if (!data.guilds[guildId][userId]) {
        data.guilds[guildId][userId] = {
            messages: 0,
            vcTime: 0,
            lastVCJoin: 0
        };
    }
    return data.guilds[guildId][userId];
}

function trackMessage(guildId, userId) {
    const data = loadActivity();
    const user = getUserActivity(guildId, userId);
    user.messages++;
    saveActivity(data);
    return user;
}

function trackVCJoin(guildId, userId) {
    const data = loadActivity();
    const user = getUserActivity(guildId, userId);
    user.lastVCJoin = Date.now();
    saveActivity(data);
    return user;
}

function trackVCLeave(guildId, userId) {
    const data = loadActivity();
    const user = getUserActivity(guildId, userId);
    if (user.lastVCJoin > 0) {
        const duration = Date.now() - user.lastVCJoin;
        user.vcTime += duration;
        user.lastVCJoin = 0;
        saveActivity(data);
    }
    return user;
}

function getGuildActivity(guildId) {
    const data = loadActivity();
    return data.guilds[guildId] || {};
}

module.exports = { loadActivity, saveActivity, getUserActivity, trackMessage, trackVCJoin, trackVCLeave, getGuildActivity };
