const { first, query, run, transaction } = require('./database');

function buildUser(userId, row, items) {
    const source = row || {};
    const user = {
        wallet: Number(source.wallet) || 0,
        bank: Number(source.bank) || 0,
        lastDaily: Number(source.last_daily) || 0,
        lastWork: Number(source.last_work) || 0,
        lastWeekly: Number(source.last_weekly) || 0,
        lastMonthly: Number(source.last_monthly) || 0,
        inventory: (items || []).map(item => ({
            name: String(item.item),
            quantity: Number(item.quantity) || 0
        }))
    };
    return user;
}

function fetchUser(userId) {
    const row = first('SELECT * FROM economy_wallet WHERE user_id = ?', userId);
    const items = query('SELECT item, quantity FROM economy_wallet_item WHERE user_id = ?', userId);
    return buildUser(userId, row, items);
}

function ensureRow(userId) {
    run('INSERT OR IGNORE INTO economy_wallet (user_id, wallet, bank, last_daily, last_work, last_weekly, last_monthly) VALUES (?, 0, 0, 0, 0, 0, 0)', userId);
}

function loadEconomy() {
    const users = {};
    for (const row of query('SELECT * FROM economy_wallet')) {
        users[String(row.user_id)] = buildUser(row.user_id, row, []);
    }
    for (const item of query('SELECT user_id, item, quantity FROM economy_wallet_item')) {
        const owner = users[String(item.user_id)];
        if (!owner) continue;
        owner.inventory.push({ name: String(item.item), quantity: Number(item.quantity) || 0 });
    }
    return { users };
}

function saveEconomy(data) {
    const users = (data && data.users) || {};
    transaction(() => {
        run('DELETE FROM economy_wallet');
        run('DELETE FROM economy_wallet_item');
        for (const userId of Object.keys(users)) {
            const user = users[userId] || {};
            run('INSERT INTO economy_wallet (user_id, wallet, bank, last_daily, last_work, last_weekly, last_monthly) VALUES (?, ?, ?, ?, ?, ?, ?)',
                userId,
                Number(user.wallet) || 0,
                Number(user.bank) || 0,
                Number(user.lastDaily) || 0,
                Number(user.lastWork) || 0,
                Number(user.lastWeekly) || 0,
                Number(user.lastMonthly) || 0);
            for (const item of (Array.isArray(user.inventory) ? user.inventory : [])) {
                if (!item || !item.name) continue;
                run('INSERT INTO economy_wallet_item (user_id, item, quantity) VALUES (?, ?, ?)',
                    userId, String(item.name), Number(item.quantity) || 0);
            }
        }
    });
}

function getUser(userId) {
    const existing = first('SELECT 1 AS ok FROM economy_wallet WHERE user_id = ?', userId);
    if (!existing) ensureRow(userId);
    return fetchUser(userId);
}

function updateWallet(userId, amount) {
    ensureRow(userId);
    run('UPDATE economy_wallet SET wallet = MAX(0, wallet + ?) WHERE user_id = ?', amount, userId);
    return fetchUser(userId);
}

function updateBank(userId, amount) {
    ensureRow(userId);
    run('UPDATE economy_wallet SET bank = MAX(0, bank + ?) WHERE user_id = ?', amount, userId);
    return fetchUser(userId);
}

function getTotal(userId) {
    const user = getUser(userId);
    return user.wallet + user.bank;
}

function parseBet(token, wallet) {
    if (token === undefined || token === null) return NaN;
    const raw = String(token).toLowerCase();
    if (raw === 'all') return Math.floor(wallet);
    if (raw === 'half') return Math.floor(wallet / 2);
    const pct = /^(\d+(?:\.\d+)?)%$/.exec(raw);
    if (pct) return Math.floor((wallet * parseFloat(pct[1])) / 100);
    return parseInt(raw, 10);
}

function addItem(userId, itemName, quantity = 1) {
    ensureRow(userId);
    run('INSERT INTO economy_wallet_item (user_id, item, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item) DO UPDATE SET quantity = quantity + excluded.quantity',
        userId, String(itemName), quantity);
    return fetchUser(userId);
}

function removeItem(userId, itemName, quantity = 1) {
    ensureRow(userId);
    const row = first('SELECT quantity FROM economy_wallet_item WHERE user_id = ? AND LOWER(item) = LOWER(?)', userId, itemName);
    if (!row || (Number(row.quantity) || 0) < quantity) return false;
    const remaining = (Number(row.quantity) || 0) - quantity;
    if (remaining <= 0) {
        run('DELETE FROM economy_wallet_item WHERE user_id = ? AND LOWER(item) = LOWER(?)', userId, itemName);
    } else {
        run('UPDATE economy_wallet_item SET quantity = ? WHERE user_id = ? AND LOWER(item) = LOWER(?)', remaining, userId, itemName);
    }
    return true;
}

function hasItem(userId, itemName, quantity = 1) {
    const row = first('SELECT quantity FROM economy_wallet_item WHERE user_id = ? AND LOWER(item) = LOWER(?)', userId, itemName);
    return Boolean(row) && (Number(row.quantity) || 0) >= quantity;
}

function getInventory(userId) {
    return getUser(userId).inventory;
}

module.exports = { loadEconomy, saveEconomy, getUser, updateWallet, updateBank, getTotal, addItem, removeItem, hasItem, getInventory, parseBet };
