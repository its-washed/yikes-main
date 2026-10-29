const fs = require('fs');
const path = require('path');

const PREMIUM_FILE = path.join(__dirname, '..', 'data', 'premium.json');

function loadPremium() {
    if (!fs.existsSync(PREMIUM_FILE)) return { premiumUsers: [], premiumCommands: [] };
    return JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf8'));
}

function savePremium(data) {
    const dir = path.dirname(PREMIUM_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify(data, null, 2));
}

function isPremium(userId) {
    return loadPremium().premiumUsers.includes(userId);
}

function addPremium(userId) {
    const d = loadPremium();
    if (!d.premiumUsers.includes(userId)) {
        d.premiumUsers.push(userId);
        savePremium(d);
    }
}

function removePremium(userId) {
    const d = loadPremium();
    d.premiumUsers = d.premiumUsers.filter(id => id !== userId);
    savePremium(d);
}

function isPremiumCommand(name) {
    return loadPremium().premiumCommands.includes(name);
}

function addPremiumCommand(name) {
    const d = loadPremium();
    if (!d.premiumCommands.includes(name)) {
        d.premiumCommands.push(name);
        savePremium(d);
    }
}

function removePremiumCommand(name) {
    const d = loadPremium();
    d.premiumCommands = d.premiumCommands.filter(c => c !== name);
    savePremium(d);
}

async function needPremium(message) {
    const { first } = require('./database');
    const { warn } = require('./context');
    if (first('SELECT 1 AS ok FROM premium WHERE guild_id = ?', message.guild.id)) return true;
    await warn(message, 'You need to have **premium** to use this command');
    return false;
}

module.exports = { loadPremium, savePremium, isPremium, addPremium, removePremium, isPremiumCommand, addPremiumCommand, removePremiumCommand, needPremium };
