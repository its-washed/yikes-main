const fs = require('fs');
const path = require('path');

const PREMIUM_FILE = path.join(__dirname, '../../data/premium.json');

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
    const data = loadPremium();
    return data.premiumUsers.includes(userId);
}

function addPremium(userId) {
    const data = loadPremium();
    if (!data.premiumUsers.includes(userId)) {
        data.premiumUsers.push(userId);
        savePremium(data);
    }
}

function removePremium(userId) {
    const data = loadPremium();
    data.premiumUsers = data.premiumUsers.filter(id => id !== userId);
    savePremium(data);
}

function isPremiumCommand(commandName) {
    const data = loadPremium();
    return data.premiumCommands.includes(commandName);
}

function addPremiumCommand(commandName) {
    const data = loadPremium();
    if (!data.premiumCommands.includes(commandName)) {
        data.premiumCommands.push(commandName);
        savePremium(data);
    }
}

function removePremiumCommand(commandName) {
    const data = loadPremium();
    data.premiumCommands = data.premiumCommands.filter(c => c !== commandName);
    savePremium(data);
}

module.exports = { loadPremium, savePremium, isPremium, addPremium, removePremium, isPremiumCommand, addPremiumCommand, removePremiumCommand };
