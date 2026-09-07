const fs = require('fs');
const path = require('path');

const LAB_FILE = path.join(__dirname, '..', '..', 'data', 'laboratory.json');

function loadLab() {
    if (!fs.existsSync(LAB_FILE)) return { experiments: {} };
    return JSON.parse(fs.readFileSync(LAB_FILE, 'utf8'));
}

function saveLab(data) {
    const dir = path.dirname(LAB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LAB_FILE, JSON.stringify(data, null, 2));
}

function getExperiments(userId) {
    const data = loadLab();
    return data.experiments[userId] || [];
}

function startExperiment(userId, name, cost) {
    const data = loadLab();
    if (!data.experiments[userId]) data.experiments[userId] = [];
    const exp = {
        id: Date.now().toString(36),
        name,
        cost,
        status: 'running',
        progress: 0,
        reward: Math.floor(cost * (1.5 + Math.random())),
        startedAt: Date.now(),
        completesAt: Date.now() + 3600000
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

module.exports = { loadLab, saveLab, getExperiments, startExperiment, collectExperiment, cancelExperiment };
