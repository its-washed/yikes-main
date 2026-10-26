const fs = require('fs');
const path = require('path');

const BIZ_FILE = path.join(__dirname, '..', 'data', 'business.json');

const MAX_LEVEL = 50;
const MAX_INCOME = 10000;
const MAX_UPKEEP = 2500;
const COLLECT_INTERVAL = 10 * 60 * 1000;

function loadBiz() {
    if (!fs.existsSync(BIZ_FILE)) return { businesses: {} };
    return JSON.parse(fs.readFileSync(BIZ_FILE, 'utf8'));
}

function saveBiz(data) {
    const dir = path.dirname(BIZ_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BIZ_FILE, JSON.stringify(data, null, 2));
}

function getBusiness(userId) {
    const data = loadBiz();
    return data.businesses[userId] || null;
}

function createBusiness(userId, name, type) {
    const data = loadBiz();
    if (data.businesses[userId]) return null;
    const bizTypes = {
        restaurant: { baseCost: 5000, baseIncome: 500, upkeep: 100 },
        tech: { baseCost: 10000, baseIncome: 1000, upkeep: 200 },
        retail: { baseCost: 3000, baseIncome: 300, upkeep: 50 },
        media: { baseCost: 7500, baseIncome: 750, upkeep: 150 },
        fitness: { baseCost: 4000, baseIncome: 400, upkeep: 75 }
    };
    const template = bizTypes[type] || bizTypes.retail;
    data.businesses[userId] = {
        name,
        type,
        level: 1,
        employees: 0,
        income: template.baseIncome,
        upkeep: template.upkeep,
        totalEarned: 0,
        createdAt: Date.now()
    };
    saveBiz(data);
    return data.businesses[userId];
}

function upgradeBusiness(userId) {
    const data = loadBiz();
    const biz = data.businesses[userId];
    if (!biz) return null;
    if (biz.level >= MAX_LEVEL) return null;
    if (biz.income >= MAX_INCOME) return null;
    const beforeIncome = biz.income;
    biz.level++;
    biz.income = Math.min(Math.floor(beforeIncome * 1.5), MAX_INCOME);
    const gain = biz.income - beforeIncome;
    biz.upkeep = Math.min(Math.floor(biz.upkeep * 1.3), MAX_UPKEEP, biz.upkeep + gain);
    saveBiz(data);
    return biz;
}

function hireEmployee(userId) {
    const data = loadBiz();
    const biz = data.businesses[userId];
    if (!biz) return null;
    if (biz.income >= MAX_INCOME) return null;
    const beforeIncome = biz.income;
    biz.income = Math.min(beforeIncome + Math.max(Math.floor(beforeIncome * 0.1), 100), MAX_INCOME);
    const gain = biz.income - beforeIncome;
    if (gain <= 0) return null;
    biz.employees++;
    biz.upkeep = Math.min(biz.upkeep + Math.min(50, gain), MAX_UPKEEP);
    saveBiz(data);
    return biz;
}

function collectIncome(userId) {
    const data = loadBiz();
    const biz = data.businesses[userId];
    if (!biz) return null;
    const now = Date.now();
    const last = biz.lastCollect || 0;
    if (now - last < COLLECT_INTERVAL) {
        return { biz, ready: false, wait: COLLECT_INTERVAL - (now - last) };
    }
    const profit = biz.income - biz.upkeep;
    biz.totalEarned += profit;
    biz.lastCollect = now;
    saveBiz(data);
    return { biz, profit, ready: true };
}

function deleteBusiness(userId) {
    const data = loadBiz();
    if (!data.businesses[userId]) return false;
    delete data.businesses[userId];
    saveBiz(data);
    return true;
}

module.exports = { loadBiz, saveBiz, getBusiness, createBusiness, upgradeBusiness, hireEmployee, collectIncome, deleteBusiness, MAX_LEVEL, MAX_INCOME, MAX_UPKEEP, COLLECT_INTERVAL };
