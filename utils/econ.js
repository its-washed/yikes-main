const { query, first, run } = require('./database');

function parseAmount(token, cash) {
    if (token === undefined || token === null) return NaN;
    const raw = String(token).toLowerCase().replace(/,/g, '');
    if (raw === 'all') return Math.floor(cash);
    if (raw === 'half') return Math.floor(cash / 2);
    const pct = /^(\d+(?:\.\d+)?)%$/.exec(raw);
    if (pct) return Math.floor((cash * parseFloat(pct[1])) / 100);
    return parseInt(raw, 10);
}

function humanize(value) {
    const num = Number(value) || 0;
    const rounded = Math.round(num * 100) / 100;
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function cleanHumanize(value) {
    const num = Number(value) || 0;
    if (Number.isInteger(num)) return num.toLocaleString('en-US');
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function econRow(userId) {
    return first('SELECT * FROM economy WHERE user_id = ?', userId) || null;
}

function ensureAccount(userId) {
    run('INSERT OR IGNORE INTO economy (user_id, cash, card) VALUES (?, ?, ?)', userId, 5000, 0);
    return econRow(userId);
}

function addCash(userId, amount) {
    run('UPDATE economy SET cash = MAX(0, cash + ?) WHERE user_id = ?', amount, userId);
}

function logging(userId, amount, action, type) {
    const row = econRow(userId) || { cash: 0, card: 0 };
    run('INSERT INTO economy_logs (user_id, amount, "action", type, created, cash, card) VALUES (?, ?, ?, ?, ?, ?, ?)',
        userId, amount, action, type, Date.now() / 1000, row.cash || 0, row.card || 0);
}

function loggingLab(userId, moderatorId, amount, action, upgradeState) {
    run('INSERT INTO economy_logs_lab (user_id, moderator_id, amount, "action", upgrade_state, created) VALUES (?, ?, ?, ?, ?, ?)',
        userId, moderatorId, amount, action, upgradeState, Date.now() / 1000);
}

function loggingBusiness(userId, moderatorId, amount, action, business) {
    run('INSERT INTO economy_logs_business (user_id, moderator_id, amount, "action", business, created) VALUES (?, ?, ?, ?, ?, ?)',
        userId, moderatorId, amount, action, String(business), Date.now() / 1000);
}

function getUsedCard(userId, business) {
    const used = first('SELECT * FROM economy_cards_used WHERE user_id = ? AND business = ?', userId, business);
    if (!used) return null;
    const userCard = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, used.card_id);
    if (!userCard) return null;
    const info = first('SELECT * FROM economy_cards WHERE id = ?', userCard.id);
    if (!info) return null;
    return { name: info.name, stars: info.stars, storage: userCard.storage, multiplier: userCard.multiplier };
}

function labEarnings(userId, upgradeState) {
    let hours = 6;
    let multiplier = 1;
    const used = getUsedCard(userId, 'lab');
    if (used) {
        hours = Number(used.storage) || 6;
        multiplier = Number(used.multiplier) || 1;
    }
    const base = 10000 + (5000 * upgradeState);
    const earningsMultiplier = 1 + (0.1 * upgradeState);
    let earningsPerHour = base * earningsMultiplier;
    earningsPerHour *= multiplier;
    const earningsCap = earningsPerHour * hours;
    const nextUpgradeCost = (base * 24) * (1 + 0.1 * upgradeState);
    return { earningsPerHour, earningsCap, nextUpgradeCost, storage: hours };
}

function getUserBusiness(userId) {
    return first('SELECT * FROM economy_business WHERE user_id = ?', userId) || null;
}

function getSystemBusiness(name) {
    return first('SELECT * FROM economy_business_list WHERE LOWER(name) = LOWER(?)', name) || null;
}

function getSystemBusinessById(id) {
    return first('SELECT * FROM economy_business_list WHERE business_id = ?', id) || null;
}

function getAllBusinesses() {
    return query('SELECT * FROM economy_business_list ORDER BY business_id ASC');
}

function businessEarning(userId, lastCollected, hourRevenue) {
    let hours = 6;
    let multiplier = 1;
    const used = getUsedCard(userId, 'business');
    if (used) {
        hours = Number(used.storage) || 6;
        multiplier = Number(used.multiplier) || 1;
    }
    const timeDifference = Date.now() / 1000 - Number(lastCollected);
    let earnings = 0;
    if (timeDifference >= 3600) earnings = hourRevenue * Math.floor(timeDifference / 3600);
    const cap = hourRevenue * hours;
    if (earnings > cap) earnings = cap;
    return earnings * multiplier;
}

function parseMembers(company) {
    if (!company) return [];
    try {
        const parsed = JSON.parse(company.members || '[]');
        return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch (err) {
        return [];
    }
}

function parseRoles(company) {
    if (!company) return {};
    try {
        const parsed = JSON.parse(company.roles || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        return {};
    }
}

function getCompanyByName(name) {
    return first('SELECT * FROM company WHERE LOWER(name) = LOWER(?)', name) || null;
}

function getCompanyByTag(tag) {
    return first('SELECT * FROM company WHERE LOWER(tag) = LOWER(?)', tag) || null;
}

function getUserCompany(userId) {
    return first('SELECT * FROM company WHERE EXISTS (SELECT 1 FROM json_each(company.members) WHERE json_each.value = ?)', String(userId)) || null;
}

function getLevelInfo(level) {
    const row = first('SELECT * FROM company_upgrades WHERE level = ?', level);
    if (row) return row;
    return { level, cost: 0, reputation: 0, members: 5, managers: 1, earnings: 500, bonus: 10000 };
}

function getUserRank(userId, company) {
    const target = company || getUserCompany(userId);
    if (!target) return 0;
    const id = Number(userId);
    if (Number(target.ceo) === id) return 4;
    const roles = parseRoles(target);
    if (Array.isArray(roles.Manager) && roles.Manager.map(Number).includes(id)) return 3;
    if (Array.isArray(roles.Senior) && roles.Senior.map(Number).includes(id)) return 2;
    if (parseMembers(target).includes(id)) return 1;
    return 0;
}

function clearCompany(company) {
    run('DELETE FROM company WHERE id = ?', company.id);
    run('DELETE FROM company_earnings WHERE company_id = ?', company.id);
    run('DELETE FROM company_requests WHERE company_id = ?', company.id);
    run('DELETE FROM company_vault WHERE company_id = ?', company.id);
    run('DELETE FROM company_voters WHERE company_id = ?', company.id);
    run('DELETE FROM company_invites WHERE company_id = ?', company.id);
    run('DELETE FROM company_projects_started WHERE company_id = ?', company.id);
}

function depositVault(company, userId, amount, type) {
    run('UPDATE company SET vault = vault + ? WHERE id = ?', amount, company.id);
    run('INSERT INTO company_vault (company_id, user_id, amount, type, created) VALUES (?, ?, ?, ?, ?)', company.id, userId, amount, type, Date.now() / 1000);
    run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);
}

function withdrawVault(company, userId, amount, type) {
    run('UPDATE company SET vault = vault - ? WHERE id = ?', amount, company.id);
    run('INSERT INTO company_vault (company_id, user_id, amount, type, created) VALUES (?, ?, ?, ?, ?)', company.id, userId, amount, type, Date.now() / 1000);
    run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', amount, userId);
}

function addVault(company, userId, amount, type) {
    run('UPDATE company SET vault = vault + ? WHERE id = ?', amount, company.id);
    run('INSERT INTO company_vault (company_id, user_id, amount, type, created) VALUES (?, ?, ?, ?, ?)', company.id, userId, amount, type, Date.now() / 1000);
}

function removeVault(company, userId, amount, type) {
    run('UPDATE company SET vault = vault - ? WHERE id = ?', amount, company.id);
    run('INSERT INTO company_vault (company_id, user_id, amount, type, created) VALUES (?, ?, ?, ?, ?)', company.id, userId, amount, type, Date.now() / 1000);
}

function activeProject(companyId) {
    return first('SELECT * FROM company_projects_started WHERE company_id = ? AND active = 1', companyId) || null;
}

function getUserNetworth(userId) {
    const user = econRow(userId);
    if (!user) return 0;
    let networth = (user.cash || 0) + (user.card || 0);
    const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
    if (lab) {
        let totalUpgradeCost = 0;
        for (let level = 1; level <= (lab.upgrade_state || 0); level++) {
            totalUpgradeCost += labEarnings(userId, level).nextUpgradeCost;
        }
        networth += 5000000 + totalUpgradeCost;
    }
    const business = getUserBusiness(userId);
    if (business) {
        const systemBusiness = getSystemBusinessById(business.business_id);
        if (systemBusiness) {
            networth += (systemBusiness.cost || 0) + businessEarning(userId, business.last_collected, systemBusiness.earnings || 0);
        }
    }
    return Math.round(networth * 100) / 100;
}

function getUserQuest(userId) {
    return first('SELECT * FROM quests_user WHERE user_id = ? AND completed = 0', userId) || null;
}

function getQuest(id) {
    return first('SELECT * FROM quests WHERE id = ?', id) || null;
}

function getRandomQuest(difficulty) {
    return first('SELECT * FROM quests WHERE difficult = ? ORDER BY RANDOM() LIMIT 1', difficulty) || null;
}

function questProgress(userId, amount) {
    const userQuest = getUserQuest(userId);
    if (!userQuest) return;
    const quest = getQuest(userQuest.id);
    if (!quest) return;
    if (quest.amount > userQuest.amount) {
        run('UPDATE quests_user SET amount = amount + ? WHERE user_id = ?', amount, userId);
    }
}

function addWinGame(userId, mode) {
    const userQuest = getUserQuest(userId);
    if (!userQuest) return;
    const quest = getQuest(userQuest.id);
    if (quest && quest.type === 'win-game' && quest.mode === mode) questProgress(userId, 1);
}

function addWinMoney(userId, mode, amount) {
    const userQuest = getUserQuest(userId);
    if (!userQuest) return;
    const quest = getQuest(userQuest.id);
    if (quest && quest.type === 'win-money' && (quest.mode === mode || quest.mode === 'any')) questProgress(userId, amount);
}

function addDepositMoney(userId, mode, amount) {
    const userQuest = getUserQuest(userId);
    if (!userQuest) return;
    const quest = getQuest(userQuest.id);
    if (!quest) return;
    if ((quest.type === 'deposit-bank-money' || quest.type === 'deposit-vault-money') && quest.mode === mode) {
        questProgress(userId, amount);
    }
}

function addCollectMoney(userId, mode, amount) {
    const userQuest = getUserQuest(userId);
    if (!userQuest) return;
    const quest = getQuest(userQuest.id);
    if (!quest || !String(quest.type).startsWith('collect-')) return;
    if (quest.mode !== mode && quest.mode !== 'any') return;
    if (String(quest.type).endsWith('-money')) questProgress(userId, amount);
    else if (String(quest.type).endsWith('-amount')) questProgress(userId, 1);
}

const humanizeClean = cleanHumanize;

module.exports = {
    humanize,
    humanizeClean,
    parseAmount,
    cleanHumanize,
    econRow,
    ensureAccount,
    addCash,
    logging,
    loggingLab,
    loggingBusiness,
    getUsedCard,
    labEarnings,
    getUserBusiness,
    getSystemBusiness,
    getSystemBusinessById,
    getAllBusinesses,
    businessEarning,
    parseMembers,
    parseRoles,
    getCompanyByName,
    getCompanyByTag,
    getUserCompany,
    getLevelInfo,
    getUserRank,
    clearCompany,
    depositVault,
    withdrawVault,
    addVault,
    removeVault,
    activeProject,
    getUserNetworth,
    getUserQuest,
    getQuest,
    getRandomQuest,
    addWinGame,
    addWinMoney,
    addDepositMoney,
    addCollectMoney
};
