const fs = require('fs');
const path = require('path');

const COMPANY_FILE = path.join(__dirname, '..', '..', 'data', 'company.json');

function loadCompany() {
    if (!fs.existsSync(COMPANY_FILE)) return { companies: {} };
    return JSON.parse(fs.readFileSync(COMPANY_FILE, 'utf8'));
}

function saveCompany(data) {
    const dir = path.dirname(COMPANY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COMPANY_FILE, JSON.stringify(data, null, 2));
}

function getCompany(ownerId) {
    const data = loadCompany();
    return data.companies[ownerId] || null;
}

function getCompanyByMember(userId) {
    const data = loadCompany();
    for (const [ownerId, company] of Object.entries(data.companies)) {
        if (company.members?.includes(userId)) return { ownerId, ...company };
    }
    return null;
}

function createCompany(ownerId, name, type) {
    const data = loadCompany();
    if (data.companies[ownerId]) return null;
    data.companies[ownerId] = {
        name,
        type,
        level: 1,
        treasury: 0,
        members: [ownerId],
        maxMembers: 5,
        projects: [],
        createdAt: Date.now()
    };
    saveCompany(data);
    return data.companies[ownerId];
}

function addMember(ownerId, userId) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return null;
    if (company.members.length >= company.maxMembers) return null;
    if (company.members.includes(userId)) return null;
    company.members.push(userId);
    saveCompany(data);
    return company;
}

function removeMember(ownerId, userId) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return false;
    company.members = company.members.filter(m => m !== userId);
    saveCompany(data);
    return true;
}

function upgradeCompany(ownerId) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return null;
    company.level++;
    company.maxMembers += 2;
    saveCompany(data);
    return company;
}

function startProject(ownerId, project) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return null;
    company.projects.push({
        id: Date.now().toString(36),
        name: project.name,
        tier: project.tier,
        cost: project.cost,
        reward: Math.floor(project.rewardMin + Math.random() * (project.rewardMax - project.rewardMin)),
        completesAt: Date.now() + project.duration
    });
    company.treasury -= project.cost;
    saveCompany(data);
    return company;
}

function collectProject(ownerId, projectId) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return null;
    const idx = company.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const project = company.projects[idx];
    if (Date.now() < project.completesAt) return { ...project, ready: false };
    company.projects.splice(idx, 1);
    company.treasury += project.reward;
    saveCompany(data);
    return { ...project, ready: true };
}

function cancelProject(ownerId, projectId) {
    const data = loadCompany();
    const company = data.companies[ownerId];
    if (!company) return null;
    const idx = company.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const project = company.projects[idx];
    const refund = Math.floor(project.cost * 0.5);
    company.projects.splice(idx, 1);
    company.treasury += refund;
    saveCompany(data);
    return { ...project, refund };
}

function deleteCompany(ownerId) {
    const data = loadCompany();
    if (!data.companies[ownerId]) return false;
    delete data.companies[ownerId];
    saveCompany(data);
    return true;
}

module.exports = { loadCompany, saveCompany, getCompany, getCompanyByMember, createCompany, addMember, removeMember, upgradeCompany, startProject, collectProject, cancelProject, deleteCompany };
