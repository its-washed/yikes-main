const { query, run, transaction } = require('./database');

function loadLab() {
    const labs = {};
    const experiments = {};
    for (const row of query('SELECT user_id, level, purchased_at FROM lab_owner')) {
        labs[String(row.user_id)] = { level: Number(row.level) || 1, purchasedAt: Number(row.purchased_at) || 0 };
    }
    for (const row of query('SELECT * FROM lab_experiment')) {
        const userId = String(row.user_id);
        if (!experiments[userId]) experiments[userId] = [];
        experiments[userId].push({
            id: String(row.exp_id),
            name: row.name,
            tier: row.tier,
            cost: Number(row.cost) || 0,
            status: row.status,
            reward: Number(row.reward) || 0,
            startedAt: Number(row.started_at) || 0,
            completesAt: Number(row.completes_at) || 0
        });
    }
    return { labs, experiments };
}

function saveLab(data) {
    const labs = (data && data.labs) || {};
    const experiments = (data && data.experiments) || {};
    transaction(() => {
        run('DELETE FROM lab_owner');
        run('DELETE FROM lab_experiment');
        for (const userId of Object.keys(labs)) {
            const lab = labs[userId] || {};
            run('INSERT OR REPLACE INTO lab_owner (user_id, level, purchased_at) VALUES (?, ?, ?)',
                userId, Number(lab.level) || 1, Number(lab.purchasedAt) || 0);
        }
        for (const userId of Object.keys(experiments)) {
            for (const exp of (Array.isArray(experiments[userId]) ? experiments[userId] : [])) {
                if (!exp || !exp.id) continue;
                run('INSERT OR REPLACE INTO lab_experiment (user_id, exp_id, name, tier, cost, status, reward, started_at, completes_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    userId, String(exp.id), exp.name || null, exp.tier || null,
                    Number(exp.cost) || 0, exp.status || 'running', Number(exp.reward) || 0,
                    Number(exp.startedAt) || 0, Number(exp.completesAt) || 0);
            }
        }
    });
}

function getLab(userId) {
    const data = loadLab();
    return data.labs[userId] || null;
}

function createLab(userId) {
    const data = loadLab();
    data.labs[userId] = {
        level: 1,
        purchasedAt: Date.now()
    };
    saveLab(data);
    return data.labs[userId];
}

function upgradeLab(userId) {
    const data = loadLab();
    const lab = data.labs[userId];
    if (!lab) return null;
    if (lab.level >= 10) return null;
    lab.level += 1;
    saveLab(data);
    return lab;
}

function getUpgradeCost(level) {
    const costs = {
        2: 500000,
        3: 1000000,
        4: 2000000,
        5: 4000000,
        6: 7000000,
        7: 10000000,
        8: 15000000,
        9: 20000000,
        10: 25000000
    };
    return costs[level] || null;
}

function getExperiments(userId) {
    const data = loadLab();
    return data.experiments[userId] || [];
}

function startExperiment(userId, recipe) {
    const data = loadLab();
    if (!data.experiments[userId]) data.experiments[userId] = [];
    const reward = Math.floor(recipe.rewardMin + Math.random() * (recipe.rewardMax - recipe.rewardMin));
    const exp = {
        id: Date.now().toString(36),
        name: recipe.name,
        tier: recipe.tier,
        cost: recipe.cost,
        status: 'running',
        reward,
        startedAt: Date.now(),
        completesAt: Date.now() + recipe.duration
    };
    data.experiments[userId].push(exp);
    saveLab(data);
    return exp;
}

function collectExperiment(userId, expId) {
    const data = loadLab();
    const exps = data.experiments[userId];
    if (!exps) return null;
    const idx = exps.findIndex(e => e.id === expId);
    if (idx === -1) return null;
    const exp = exps[idx];
    if (Date.now() < exp.completesAt) return { ...exp, ready: false };
    exps.splice(idx, 1);
    saveLab(data);
    return { ...exp, ready: true };
}

function cancelExperiment(userId, expId) {
    const data = loadLab();
    const exps = data.experiments[userId];
    if (!exps) return false;
    const idx = exps.findIndex(e => e.id === expId);
    if (idx === -1) return false;
    exps.splice(idx, 1);
    saveLab(data);
    return true;
}

module.exports = { loadLab, saveLab, getLab, createLab, upgradeLab, getUpgradeCost, getExperiments, startExperiment, collectExperiment, cancelExperiment };
