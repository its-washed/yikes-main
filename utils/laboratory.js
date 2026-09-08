const fs = require('fs');
const path = require('path');

const LAB_FILE = path.join(__dirname, '..', '..', 'data', 'laboratory.json');

function loadLab() {
    if (!fs.existsSync(LAB_FILE)) return { labs: {}, experiments: {} };
    const data = JSON.parse(fs.readFileSync(LAB_FILE, 'utf8'));
    if (!data.labs) data.labs = {};
    if (!data.experiments) data.experiments = {};
    return data;
}

function saveLab(data) {
    const dir = path.dirname(LAB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LAB_FILE, JSON.stringify(data, null, 2));
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
