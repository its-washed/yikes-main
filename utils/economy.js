const fs = require('fs');
const path = require('path');

const ECONOMY_FILE = path.join(__dirname, '../../data/economy.json');

function loadEconomy() {
    if (!fs.existsSync(ECONOMY_FILE)) return { users: {} };
    return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
}

function saveEconomy(data) {
    const dir = path.dirname(ECONOMY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 2));
}

function getUser(userId) {
    const data = loadEconomy();
    if (!data.users[userId]) {
        data.users[userId] = {
            wallet: 0,
            bank: 0,
            lastDaily: 0,
            lastWork: 0,
            lastWeekly: 0,
            lastMonthly: 0,
            inventory: []
        };
        saveEconomy(data);
    }
    return data.users[userId];
}

function updateWallet(userId, amount) {
    const data = loadEconomy();
    const user = getUser(userId);
    user.wallet += amount;
    if (user.wallet < 0) user.wallet = 0;
    saveEconomy(data);
    return user;
}

function updateBank(userId, amount) {
    const data = loadEconomy();
    const user = getUser(userId);
    user.bank += amount;
    if (user.bank < 0) user.bank = 0;
    saveEconomy(data);
    return user;
}

function getTotal(userId) {
    const user = getUser(userId);
    return user.wallet + user.bank;
}

module.exports = { loadEconomy, saveEconomy, getUser, updateWallet, updateBank, getTotal };
