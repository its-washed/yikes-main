const { first, query, run, transaction } = require('./database');

const MAX_LEVEL = 50;
const MAX_INCOME = 10000;
const MAX_UPKEEP = 2500;
const COLLECT_INTERVAL = 10 * 60 * 1000;

function rowToBusiness(row) {
    return {
        name: row.name,
        type: row.type,
        level: Number(row.level) || 0,
        employees: Number(row.employees) || 0,
        income: Number(row.income) || 0,
        upkeep: Number(row.upkeep) || 0,
        totalEarned: Number(row.total_earned) || 0,
        createdAt: Number(row.created_at) || 0,
        lastCollect: Number(row.last_collect) || 0
    };
}

function loadBiz() {
    const businesses = {};
    for (const row of query('SELECT * FROM business_owner')) {
        businesses[String(row.user_id)] = rowToBusiness(row);
    }
    return { businesses };
}

function saveBiz(data) {
    const businesses = (data && data.businesses) || {};
    transaction(() => {
        run('DELETE FROM business_owner');
        for (const userId of Object.keys(businesses)) {
            const biz = businesses[userId] || {};
            run('INSERT OR REPLACE INTO business_owner (user_id, name, type, level, employees, income, upkeep, total_earned, created_at, last_collect) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                userId,
                biz.name || null,
                biz.type || null,
                Number(biz.level) || 0,
                Number(biz.employees) || 0,
                Number(biz.income) || 0,
                Number(biz.upkeep) || 0,
                Number(biz.totalEarned) || 0,
                Number(biz.createdAt) || 0,
                Number(biz.lastCollect) || 0);
        }
    });
}

function getBusiness(userId) {
    const row = first('SELECT * FROM business_owner WHERE user_id = ?', userId);
    return row ? rowToBusiness(row) : null;
}

function createBusiness(userId, name, type) {
    if (getBusiness(userId)) return null;
    const bizTypes = {
        restaurant: { baseCost: 5000, baseIncome: 500, upkeep: 100 },
        tech: { baseCost: 10000, baseIncome: 1000, upkeep: 200 },
        retail: { baseCost: 3000, baseIncome: 300, upkeep: 50 },
        media: { baseCost: 7500, baseIncome: 750, upkeep: 150 },
        fitness: { baseCost: 4000, baseIncome: 400, upkeep: 75 }
    };
    const template = bizTypes[type] || bizTypes.retail;
    run('INSERT INTO business_owner (user_id, name, type, level, employees, income, upkeep, total_earned, created_at, last_collect) VALUES (?, ?, ?, 1, 0, ?, ?, 0, ?, 0)',
        userId, name, type, template.baseIncome, template.upkeep, Date.now());
    return getBusiness(userId);
}

function upgradeBusiness(userId) {
    const biz = getBusiness(userId);
    if (!biz) return null;
    if (biz.level >= MAX_LEVEL) return null;
    if (biz.income >= MAX_INCOME) return null;
    const beforeIncome = biz.income;
    biz.level++;
    biz.income = Math.min(Math.floor(beforeIncome * 1.5), MAX_INCOME);
    const gain = biz.income - beforeIncome;
    biz.upkeep = Math.min(Math.floor(biz.upkeep * 1.3), MAX_UPKEEP, biz.upkeep + gain);
    run('UPDATE business_owner SET level = ?, income = ?, upkeep = ? WHERE user_id = ?',
        biz.level, biz.income, biz.upkeep, userId);
    return biz;
}

function hireEmployee(userId) {
    const biz = getBusiness(userId);
    if (!biz) return null;
    if (biz.income >= MAX_INCOME) return null;
    const beforeIncome = biz.income;
    biz.income = Math.min(beforeIncome + Math.max(Math.floor(beforeIncome * 0.1), 100), MAX_INCOME);
    const gain = biz.income - beforeIncome;
    if (gain <= 0) return null;
    biz.employees++;
    biz.upkeep = Math.min(biz.upkeep + Math.min(50, gain), MAX_UPKEEP);
    run('UPDATE business_owner SET employees = ?, income = ?, upkeep = ? WHERE user_id = ?',
        biz.employees, biz.income, biz.upkeep, userId);
    return biz;
}

function collectIncome(userId) {
    const biz = getBusiness(userId);
    if (!biz) return null;
    const now = Date.now();
    const last = biz.lastCollect || 0;
    if (now - last < COLLECT_INTERVAL) {
        return { biz, ready: false, wait: COLLECT_INTERVAL - (now - last) };
    }
    const profit = biz.income - biz.upkeep;
    biz.totalEarned += profit;
    biz.lastCollect = now;
    run('UPDATE business_owner SET total_earned = ?, last_collect = ? WHERE user_id = ?',
        biz.totalEarned, biz.lastCollect, userId);
    return { biz, profit, ready: true };
}

function deleteBusiness(userId) {
    const result = run('DELETE FROM business_owner WHERE user_id = ?', userId);
    return result.changes > 0;
}

module.exports = { loadBiz, saveBiz, getBusiness, createBusiness, upgradeBusiness, hireEmployee, collectIncome, deleteBusiness, MAX_LEVEL, MAX_INCOME, MAX_UPKEEP, COLLECT_INTERVAL };
