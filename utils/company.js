const { first, query, run, transaction } = require('./database');

function parseList(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function rowToCompany(row) {
    return {
        name: row.name,
        type: row.type,
        level: Number(row.level) || 0,
        treasury: Number(row.treasury) || 0,
        members: parseList(row.members),
        maxMembers: Number(row.max_members) || 0,
        projects: parseList(row.projects),
        createdAt: Number(row.created_at) || 0
    };
}

function loadCompany() {
    const companies = {};
    for (const row of query('SELECT * FROM company_owner')) {
        companies[String(row.id)] = rowToCompany(row);
    }
    return { companies };
}

function saveCompany(data) {
    const companies = (data && data.companies) || {};
    transaction(() => {
        run('DELETE FROM company_owner');
        for (const id of Object.keys(companies)) {
            const company = companies[id] || {};
            run('INSERT OR REPLACE INTO company_owner (id, name, type, level, treasury, members, max_members, projects, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                id,
                company.name || null,
                company.type || null,
                Number(company.level) || 0,
                Number(company.treasury) || 0,
                JSON.stringify(Array.isArray(company.members) ? company.members : []),
                Number(company.maxMembers) || 0,
                JSON.stringify(Array.isArray(company.projects) ? company.projects : []),
                Number(company.createdAt) || 0);
        }
    });
}

function getCompany(ownerId) {
    const row = first('SELECT * FROM company_owner WHERE id = ?', ownerId);
    return row ? rowToCompany(row) : null;
}

function getCompanyByMember(userId) {
    for (const row of query('SELECT * FROM company_owner')) {
        if (parseList(row.members).includes(userId)) {
            return { ownerId: String(row.id), ...rowToCompany(row) };
        }
    }
    return null;
}

function createCompany(ownerId, name, type) {
    if (getCompany(ownerId)) return null;
    run('INSERT INTO company_owner (id, name, type, level, treasury, members, max_members, projects, created_at) VALUES (?, ?, ?, 1, 0, ?, 5, ?, ?)',
        ownerId, name, type, JSON.stringify([ownerId]), '[]', Date.now());
    return getCompany(ownerId);
}

function addMember(ownerId, userId) {
    const company = getCompany(ownerId);
    if (!company) return null;
    if (company.members.length >= company.maxMembers) return null;
    if (company.members.includes(userId)) return null;
    company.members.push(userId);
    run('UPDATE company_owner SET members = ? WHERE id = ?', JSON.stringify(company.members), ownerId);
    return company;
}

function removeMember(ownerId, userId) {
    const company = getCompany(ownerId);
    if (!company) return false;
    company.members = company.members.filter(m => m !== userId);
    run('UPDATE company_owner SET members = ? WHERE id = ?', JSON.stringify(company.members), ownerId);
    return true;
}

function upgradeCompany(ownerId) {
    const company = getCompany(ownerId);
    if (!company) return null;
    company.level++;
    company.maxMembers += 2;
    run('UPDATE company_owner SET level = ?, max_members = ? WHERE id = ?', company.level, company.maxMembers, ownerId);
    return company;
}

function startProject(ownerId, project) {
    const company = getCompany(ownerId);
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
    run('UPDATE company_owner SET projects = ?, treasury = ? WHERE id = ?', JSON.stringify(company.projects), company.treasury, ownerId);
    return company;
}

function collectProject(ownerId, projectId) {
    const company = getCompany(ownerId);
    if (!company) return null;
    const idx = company.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const project = company.projects[idx];
    if (Date.now() < project.completesAt) return { ...project, ready: false };
    company.projects.splice(idx, 1);
    company.treasury += project.reward;
    run('UPDATE company_owner SET projects = ?, treasury = ? WHERE id = ?', JSON.stringify(company.projects), company.treasury, ownerId);
    return { ...project, ready: true };
}

function cancelProject(ownerId, projectId) {
    const company = getCompany(ownerId);
    if (!company) return null;
    const idx = company.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const project = company.projects[idx];
    const refund = Math.floor(project.cost * 0.5);
    company.projects.splice(idx, 1);
    company.treasury += refund;
    run('UPDATE company_owner SET projects = ?, treasury = ? WHERE id = ?', JSON.stringify(company.projects), company.treasury, ownerId);
    return { ...project, refund };
}

function deleteCompany(ownerId) {
    const result = run('DELETE FROM company_owner WHERE id = ?', ownerId);
    return result.changes > 0;
}

module.exports = { loadCompany, saveCompany, getCompany, getCompanyByMember, createCompany, addMember, removeMember, upgradeCompany, startProject, collectProject, cancelProject, deleteCompany };
