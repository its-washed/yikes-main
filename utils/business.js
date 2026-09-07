const fs = require('fs');
const path = require('path');

const BIZ_FILE = path.join(__dirname, '..', '..', 'data', 'business.json');

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
    biz.level++;
    biz.income = Math.floor(biz.income * 1.5);
    biz.upkeep = Math.floor(biz.upkeep * 1.3);
    saveBiz(data);
    return biz;
}

function hireEmployee(userId) {
    const data = loadBiz();
    const biz = data.businesses[userId];
    if (!biz) return null;
    biz.employees++;
    biz.income = Math.floor(biz.income * 1.1);
    biz.upkeep += 50;
    saveBiz(data);
    return biz;
}

function collectIncome(userId) {
    const data = loadBiz();
    const biz = data.businesses[userId];
    if (!biz) return null;
    const profit = biz.income - biz.upkeep;
    biz.totalEarned += profit;
    saveBiz(data);
    return { biz, profit };
}

function deleteBusiness(userId) {
    const data = loadBiz();
    if (!data.businesses[userId]) return false;
    delete data.businesses[userId];
    saveBiz(data);
    return true;
}

module.exports = { loadBiz, saveBiz, getBusiness, createBusiness, upgradeBusiness, hireEmployee, collectIncome, deleteBusiness };
