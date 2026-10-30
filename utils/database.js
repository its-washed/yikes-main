const fs = require('fs');
const path = require('path');

process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name === 'ExperimentalWarning' && /SQLite/i.test(String(warning.message || ''))) return;
    console.warn(warning);
});

const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'bot.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SAFE = 9007199254740991;

let handle = null;
const statements = new Map();

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function bind(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'bigint' || typeof value === 'string') return value;
    if (value instanceof Uint8Array) return value;
    return JSON.stringify(value);
}

function normalize(value) {
    if (typeof value === 'bigint') {
        return (value >= -SAFE && value <= SAFE) ? Number(value) : value.toString();
    }
    if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
    return value;
}

function shape(row) {
    const out = {};
    for (const key of Object.keys(row)) out[key] = normalize(row[key]);
    return out;
}

function prepare(sql) {
    if (!handle) initDatabase();
    let stmt = statements.get(sql);
    if (!stmt) {
        stmt = handle.prepare(sql);
        stmt.setReadBigInts(true);
        statements.set(sql, stmt);
    }
    return stmt;
}

function query(sql, ...params) {
    return prepare(sql).all(...params.map(bind)).map(shape);
}

function first(sql, ...params) {
    const rows = query(sql, ...params);
    return rows.length ? rows[0] : null;
}

function run(sql, ...params) {
    const info = prepare(sql).run(...params.map(bind));
    return { changes: Number(info.changes), lastInsertRowid: normalize(info.lastInsertRowid) };
}

function exec(sql) {
    handle.exec(sql);
}

function transaction(work) {
    handle.exec('BEGIN');
    try {
        const result = work();
        handle.exec('COMMIT');
        return result;
    } catch (err) {
        handle.exec('ROLLBACK');
        throw err;
    }
}

function readJson(fileName) {
    const filePath = path.join(DATA_DIR, fileName);
    ensureDataDir();
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Failed reading ${fileName}:`, err);
    }
    return null;
}

function writeJSON(fileName, data) {
    const filePath = path.join(DATA_DIR, fileName);
    ensureDataDir();
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Failed writing ${fileName}:`, err);
    }
}

function insertLevels() {
    const levels = readJson('levels.json');
    if (!levels || typeof levels !== 'object') return;
    for (const guildId of Object.keys(levels)) {
        const entries = levels[guildId];
        if (!entries || typeof entries !== 'object') continue;
        for (const userId of Object.keys(entries)) {
            const entry = entries[userId] || {};
            run('INSERT OR IGNORE INTO level_user (guild_id, user_id, xp, level) VALUES (?, ?, ?, ?)',
                guildId, userId, Number(entry.xp) || 0, Number(entry.level) || 0);
        }
    }
}

function insertEconomy() {
    const economy = readJson('economy.json');
    const users = economy && economy.users;
    if (!users || typeof users !== 'object') return;
    for (const userId of Object.keys(users)) {
        const entry = users[userId] || {};
        run('INSERT OR IGNORE INTO economy (user_id, cash, item_bank) VALUES (?, ?, ?)',
            userId, Number(entry.wallet) || 0, Number(entry.bank) || 0);
    }
}

function warnStamp(date) {
    const when = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const pad = value => String(value).padStart(2, '0');
    const hour = when.getHours();
    return `${when.getDate()}/${pad(when.getMonth() + 1)}/${String(when.getFullYear()).slice(-2)} at ${pad(hour % 12 === 0 ? 12 : hour % 12)}:${pad(when.getMinutes())} ${hour < 12 ? 'AM' : 'PM'}`;
}

function insertWarns() {
    if (first('SELECT 1 AS ready FROM warns LIMIT 1')) return;
    const migrated = first('SELECT value FROM meta WHERE name = ?', 'warns_migrated');
    if (migrated && migrated.value === '1') return;
    const legacyMarker = readJson('warns_migrated.json');
    if (legacyMarker && legacyMarker.done) {
        run('INSERT OR REPLACE INTO meta (name, value) VALUES (?, ?)', 'warns_migrated', '1');
        return;
    }
    const sources = [readJson('warns.json'), readJson('warnings.json')];
    for (const source of sources) {
        if (!source || typeof source !== 'object') continue;
        for (const guildId of Object.keys(source)) {
            const members = source[guildId];
            if (!members || typeof members !== 'object') continue;
            for (const userId of Object.keys(members)) {
                const list = Array.isArray(members[userId]) ? members[userId] : [];
                for (const entry of list) {
                    if (!entry) continue;
                    run('INSERT INTO warns (guild_id, user_id, author_id, time, reason) VALUES (?, ?, ?, ?, ?)',
                        guildId, userId, entry.moderator || '0',
                        warnStamp(entry.time ? new Date(Number(entry.time)) : new Date()),
                        entry.reason || 'No reason provided');
                }
            }
        }
    }
    run('INSERT OR REPLACE INTO meta (name, value) VALUES (?, ?)', 'warns_migrated', '1');
}

function seedLegacyData() {
    try { insertLevels(); } catch (err) { console.error('level migration failed:', err.message); }
    try { insertEconomy(); } catch (err) { console.error('economy migration failed:', err.message); }
}

function tableEmpty(name) {
    try {
        const row = first(`SELECT COUNT(*) AS total FROM ${name}`);
        return !row || Number(row.total) === 0;
    } catch (err) {
        return false;
    }
}

function importJson(fileName, table, importFn) {
    if (!tableEmpty(table)) return;
    const data = readJson(fileName);
    if (!data || typeof data !== 'object') return;
    importFn(data);
}

function migrateJsonData() {
    transaction(() => {
        importJson('config.json', 'guild_config', data => {
            for (const guildId of Object.keys(data)) {
                const cfg = data[guildId];
                if (!cfg || typeof cfg !== 'object') continue;
                for (const key of Object.keys(cfg)) {
                    run('INSERT OR REPLACE INTO guild_config (guild_id, name, value) VALUES (?, ?, ?)',
                        guildId, key, JSON.stringify(cfg[key] === undefined ? null : cfg[key]));
                }
            }
        });

        importJson('economy.json', 'economy_wallet', data => {
            const users = data.users;
            if (!users || typeof users !== 'object') return;
            for (const userId of Object.keys(users)) {
                const user = users[userId] || {};
                run('INSERT INTO economy_wallet (user_id, wallet, bank, last_daily, last_work, last_weekly, last_monthly) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    userId, Number(user.wallet) || 0, Number(user.bank) || 0,
                    Number(user.lastDaily) || 0, Number(user.lastWork) || 0,
                    Number(user.lastWeekly) || 0, Number(user.lastMonthly) || 0);
                for (const item of (Array.isArray(user.inventory) ? user.inventory : [])) {
                    if (!item || !item.name) continue;
                    run('INSERT OR REPLACE INTO economy_wallet_item (user_id, item, quantity) VALUES (?, ?, ?)',
                        userId, String(item.name), Number(item.quantity) || 0);
                }
            }
        });

        importJson('activity.json', 'activity_stats', data => {
            const guilds = data.guilds;
            if (!guilds || typeof guilds !== 'object') return;
            for (const guildId of Object.keys(guilds)) {
                const users = guilds[guildId];
                if (!users || typeof users !== 'object') continue;
                for (const userId of Object.keys(users)) {
                    const entry = users[userId] || {};
                    run('INSERT INTO activity_stats (guild_id, user_id, messages, vc_time, last_vc_join) VALUES (?, ?, ?, ?, ?)',
                        guildId, userId, Number(entry.messages) || 0,
                        Number(entry.vcTime) || 0, Number(entry.lastVCJoin) || 0);
                }
            }
        });

        importJson('developer.json', 'dev_user', data => {
            for (const id of (Array.isArray(data.developers) ? data.developers : [])) run('INSERT OR IGNORE INTO dev_user (user_id) VALUES (?)', id);
            for (const id of (Array.isArray(data.blacklist) ? data.blacklist : [])) run('INSERT OR IGNORE INTO dev_blacklist (user_id) VALUES (?)', id);
            for (const id of (Array.isArray(data.blacklistedServers) ? data.blacklistedServers : [])) run('INSERT OR IGNORE INTO dev_server (guild_id) VALUES (?)', id);
            for (const id of (Array.isArray(data.globalDisabled) ? data.globalDisabled : [])) run('INSERT OR IGNORE INTO dev_disabled (command) VALUES (?)', id);
            const serverDisabled = data.serverDisabled || {};
            for (const guildId of Object.keys(serverDisabled)) {
                for (const command of (Array.isArray(serverDisabled[guildId]) ? serverDisabled[guildId] : [])) {
                    run('INSERT OR IGNORE INTO dev_guild_disabled (guild_id, command) VALUES (?, ?)', guildId, command);
                }
            }
        });

        importJson('premium.json', 'premium_user', data => {
            for (const id of (Array.isArray(data.premiumUsers) ? data.premiumUsers : [])) run('INSERT OR IGNORE INTO premium_user (user_id) VALUES (?)', id);
            for (const name of (Array.isArray(data.premiumCommands) ? data.premiumCommands : [])) run('INSERT OR IGNORE INTO premium_command (command) VALUES (?)', String(name).toLowerCase());
        });

        importJson('devkit.json', 'devkit_state', data => {
            for (const key of Object.keys(data)) run('INSERT OR REPLACE INTO devkit_state (name, value) VALUES (?, ?)', key, JSON.stringify(data[key]));
        });

        importJson('afk.json', 'afk_state', data => {
            for (const guildId of Object.keys(data)) {
                const guild = data[guildId];
                if (!guild || typeof guild !== 'object') continue;
                for (const userId of Object.keys(guild)) {
                    const entry = guild[userId] || {};
                    run('INSERT OR REPLACE INTO afk_state (guild_id, user_id, reason, timestamp) VALUES (?, ?, ?, ?)',
                        guildId, userId, entry.reason || 'AFK', Number(entry.timestamp) || Date.now());
                }
            }
        });

        importJson('boosters.json', 'booster_setting', data => {
            for (const guildId of Object.keys(data)) {
                const guild = data[guildId];
                if (!guild || typeof guild !== 'object') continue;
                if (guild.boostRole) run('INSERT OR REPLACE INTO booster_setting (guild_id, boost_role) VALUES (?, ?)', guildId, guild.boostRole);
                const custom = guild.customRoles || {};
                for (const userId of Object.keys(custom)) {
                    run('INSERT OR REPLACE INTO booster_custom_role (guild_id, user_id, role_id) VALUES (?, ?, ?)', guildId, userId, custom[userId]);
                }
            }
        });

        importJson('pfps.json', 'image_pool', data => {
            for (const category of Object.keys(data)) {
                const urls = data[category];
                if (!Array.isArray(urls)) continue;
                for (const url of urls) {
                    if (typeof url === 'string' && url) run('INSERT OR IGNORE INTO image_pool (category, url) VALUES (?, ?)', category, url);
                }
            }
        });

        importJson('business.json', 'business_owner', data => {
            const businesses = data.businesses;
            if (!businesses || typeof businesses !== 'object') return;
            for (const userId of Object.keys(businesses)) {
                const entry = businesses[userId] || {};
                run('INSERT OR REPLACE INTO business_owner (user_id, name, type, level, employees, income, upkeep, total_earned, created_at, last_collect) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    userId, entry.name || null, entry.type || null, Number(entry.level) || 0,
                    Number(entry.employees) || 0, Number(entry.income) || 0, Number(entry.upkeep) || 0,
                    Number(entry.totalEarned) || 0, Number(entry.createdAt) || 0, Number(entry.lastCollect) || 0);
            }
        });

        importJson('company.json', 'company_owner', data => {
            const companies = data.companies;
            if (!companies || typeof companies !== 'object') return;
            for (const id of Object.keys(companies)) {
                const entry = companies[id] || {};
                run('INSERT OR REPLACE INTO company_owner (id, name, type, level, treasury, members, max_members, projects, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    id, entry.name || null, entry.type || null, Number(entry.level) || 0,
                    Number(entry.treasury) || 0, JSON.stringify(Array.isArray(entry.members) ? entry.members : []),
                    Number(entry.maxMembers) || 0, JSON.stringify(Array.isArray(entry.projects) ? entry.projects : []),
                    Number(entry.createdAt) || 0);
            }
        });

        importJson('laboratory.json', 'lab_owner', data => {
            const labs = data.labs || {};
            for (const userId of Object.keys(labs)) {
                const entry = labs[userId] || {};
                run('INSERT OR REPLACE INTO lab_owner (user_id, level, purchased_at) VALUES (?, ?, ?)',
                    userId, Number(entry.level) || 1, Number(entry.purchasedAt) || 0);
            }
            const experiments = data.experiments || {};
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

        importJson('cards.json', 'card_catalog', data => {
            for (const ownerId of Object.keys(data)) {
                const cards = data[ownerId] && data[ownerId].cards;
                if (!Array.isArray(cards)) continue;
                for (const card of cards) {
                    if (!card || !card.id) continue;
                    run('INSERT OR REPLACE INTO card_catalog (owner_id, card_id, character, series, tier, rarity, emoji, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        ownerId, String(card.id), card.character || null, card.series || null,
                        card.tier || null, card.rarity || null, card.emoji || null, JSON.stringify(card));
                }
            }
        });
    });
}

function fixWarnTables() {
    try { query('SELECT warn FROM warns_rewards LIMIT 1'); } catch (err) {
        try {
            exec('ALTER TABLE warns_rewards RENAME TO warns_rewards_old');
            exec('CREATE TABLE warns_rewards (guild_id BIGINT NOT NULL, warn INT NOT NULL, role_id BIGINT NOT NULL)');
            exec('INSERT INTO warns_rewards (guild_id, warn, role_id) SELECT guild_id, warns, role_id FROM warns_rewards_old');
            exec('DROP TABLE warns_rewards_old');
        } catch (renameErr) { }
    }
    try { query('SELECT warn FROM warns_punishment LIMIT 1'); } catch (err) {
        try {
            exec('ALTER TABLE warns_punishment RENAME TO warns_punishment_old');
            exec('CREATE TABLE warns_punishment (guild_id BIGINT NOT NULL, warn INT NOT NULL, action TEXT NOT NULL, time REAL)');
            exec('INSERT INTO warns_punishment (guild_id, warn, action, time) SELECT guild_id, warns, punishment, NULL FROM warns_punishment_old');
            exec('DROP TABLE warns_punishment_old');
        } catch (renameErr) { }
    }
}

function ensureColumns() {
    const upgrades = [
        ['jail', 'channel_id', 'BIGINT'],
        ['whitelist_module', 'embed', "TEXT DEFAULT 'default'"],
        ['whitelist_module', 'punishment', "TEXT DEFAULT 'kick'"],
        ['economy_config', 'vote', 'REAL DEFAULT 2500'],
        ['jail_members', 'roles', 'TEXT'],
        ['jail_members', 'jailed_at', 'TIMESTAMP'],
        ['jail_members', 'expires', 'TIMESTAMP'],
        ['voiceban', 'moderator_id', 'BIGINT'],
        ['voiceban', 'timestamp', 'REAL'],
        ['logging', 'ignored_roles', "TEXT DEFAULT '[]'"],
        ['global_disabled_commands', 'status', 'BOOLEAN DEFAULT FALSE'],
        ['global_disabled_commands', 'user', 'BIGINT'],
        ['global_disabled_commands', 'reason', 'TEXT'],
        ['global_disabled_commands', 'timestamp', 'REAL'],
        ['global_beta_commands', 'status', 'BOOLEAN DEFAULT FALSE'],
        ['global_beta_commands', 'user', 'BIGINT'],
        ['global_beta_commands', 'timestamp', 'REAL'],
        ['instance', 'name', 'TEXT'],
        ['instance', 'paid', 'REAL'],
        ['instance', 'guild_id', 'BIGINT'],
        ['instance', 'transfers', 'INT DEFAULT 3'],
        ['instance_addon', 'user_id', 'BIGINT'],
        ['instance_addon', 'paid', 'REAL'],
        ['instance_addon', 'owner_id', 'BIGINT'],
        ['autoreact', 'trigger', 'TEXT'],
        ['autoreact', 'reactions', 'TEXT'],
        ['autoreact_channel', 'reactions', 'TEXT'],
        ['autoresponder', 'strict', 'BOOLEAN DEFAULT TRUE'],
        ['autoresponder', '"delete"', 'BOOLEAN DEFAULT FALSE'],
        ['autoresponder', 'reply', 'BOOLEAN DEFAULT FALSE'],
        ['team_members', 'rank', 'TEXT'],
        ['team_members', 'socials', "TEXT DEFAULT '{}'"],
        ['economy', 'item_case', 'INT DEFAULT 0'],
        ['economy', 'item_case_blackice', 'INT DEFAULT 0'],
        ['economy', 'bonus', 'INT DEFAULT 0'],
        ['economy', 'work', 'INT DEFAULT 0'],
        ['economy', 'slut', 'INT DEFAULT 0'],
        ['economy', 'rob', 'INT DEFAULT 0'],
        ['economy', 'daily', 'INT DEFAULT 0'],
        ['economy', 'daily_streak', 'INT DEFAULT 0'],
        ['economy', 'quest', 'INT DEFAULT 0'],
        ['booster_module', 'base', 'BIGINT'],
        ['booster_module', '"limit"', 'INT'],
        ['booster_module', 'share_limit', 'INT'],
        ['nuke_scheduler', 'schedule', 'INT DEFAULT 0'],
        ['nuke_scheduler', 'last_nuke', 'REAL DEFAULT 0'],
        ['guessthenumber_settings', 'lock', 'BOOLEAN DEFAULT FALSE'],
        ['ticket_topics', 'support_roles', "TEXT DEFAULT '[]'"],
        ['ticket_topics', 'embed', 'TEXT'],
        ['ticket_topics', 'category_id', 'BIGINT'],
        ['ticket_topics', 'channel_name', 'TEXT'],
        ['ticket_topics', 'channel_topic', 'TEXT'],
        ['ticket_topics', 'weight', 'INT DEFAULT 0'],
        ['ticket_topics', 'status', 'BOOLEAN DEFAULT TRUE'],
        ['ticket_modals', 'topic', 'TEXT'],
        ['ticket_modals', 'name', 'TEXT'],
        ['ticket_modals', 'description', 'TEXT'],
        ['ticket_modals', 'code', 'TEXT'],
        ['ticket_statuses', 'category_id', 'BIGINT'],
        ['ticket_transcripts_access', 'users', 'TEXT'],
        ['economy', 'item_booster', 'INT DEFAULT 0'],
        ['counters', 'role_id', 'BIGINT'],
        ['suggestions_module', 'threads', 'BOOLEAN DEFAULT FALSE'],
        ['vanity', 'roles', "TEXT DEFAULT '[]'"],
        ['voicetrack_settings', 'mute_track', 'BOOLEAN DEFAULT FALSE'],
        ['store_orders', 'serial_code', 'TEXT'],
        ['store_orders', 'product_id', 'INT'],
        ['store_orders', 'claimed', 'BOOLEAN DEFAULT FALSE'],
        ['store_orders', 'claimed_by', 'BIGINT']
    ];
    for (const [table, column, type] of upgrades) {
        try {
            handle.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        } catch (err) {
        }
    }
}

function fixTicketTables() {

    try {
        const info = query('SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?', 'ticket_modals', 'question');
        if (info.length && Number(info[0].notnull) !== 0) {
            try {
                exec('ALTER TABLE ticket_modals RENAME TO ticket_modals_old');
                exec('CREATE TABLE IF NOT EXISTS ticket_modals (guild_id BIGINT NOT NULL,question TEXT,label TEXT,style TEXT,required BOOLEAN DEFAULT TRUE,min_length INT,max_length INT,topic TEXT,name TEXT,description TEXT,code TEXT)');
                exec('INSERT INTO ticket_modals (guild_id, question, label, style, required, min_length, max_length, topic, name, description, code) SELECT guild_id, question, label, style, required, min_length, max_length, topic, name, description, code FROM ticket_modals_old');
                exec('DROP TABLE IF EXISTS ticket_modals_old');
            } catch (err2) {
                try {
                    exec('DROP TABLE IF EXISTS ticket_modals');
                    exec('ALTER TABLE ticket_modals_old RENAME TO ticket_modals');
                } catch (err3) {}
            }
        }
    } catch (err) {}


    try {
        const info = query('SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?', 'ticket_transcripts_access', 'moderator_id');
        if (info.length && Number(info[0].notnull) !== 0) {
            try {
                exec('ALTER TABLE ticket_transcripts_access RENAME TO ticket_transcripts_access_old');
                exec('CREATE TABLE IF NOT EXISTS ticket_transcripts_access (guild_id BIGINT NOT NULL,moderator_id BIGINT,user_id BIGINT,users TEXT)');
                exec('INSERT INTO ticket_transcripts_access (guild_id, moderator_id, user_id, users) SELECT guild_id, moderator_id, user_id, NULL FROM ticket_transcripts_access_old');
                exec('DROP TABLE IF EXISTS ticket_transcripts_access_old');
            } catch (err2) {
                try {
                    exec('DROP TABLE IF EXISTS ticket_transcripts_access');
                    exec('ALTER TABLE ticket_transcripts_access_old RENAME TO ticket_transcripts_access');
                } catch (err3) {}
            }
        }
    } catch (err) {}
}

function fixPaymentTables() {
    try { query('SELECT guild_id FROM payment_methods LIMIT 1'); } catch (err) {
        try {
            exec('DROP TABLE IF EXISTS payment_methods');
            exec('CREATE TABLE payment_methods (guild_id BIGINT NOT NULL, method TEXT NOT NULL, receiver TEXT NOT NULL, available BOOLEAN DEFAULT TRUE)');
        } catch (renameErr) { }
    }
    try { query('SELECT guild_id FROM payment_currency LIMIT 1'); } catch (err) {
        try {
            exec('DROP TABLE IF EXISTS payment_currency');
            exec('CREATE TABLE payment_currency (guild_id BIGINT PRIMARY KEY, currency TEXT NOT NULL)');
        } catch (renameErr) { }
    }
    try { query('SELECT message FROM checkout LIMIT 1'); } catch (err) {
        try { exec('CREATE TABLE IF NOT EXISTS checkout (message BIGINT PRIMARY KEY, amount TEXT)'); } catch (renameErr) { }
    }
    try { query('SELECT owner_id FROM instance LIMIT 1'); } catch (err) {
        try { exec('CREATE TABLE IF NOT EXISTS instance (user_id BIGINT PRIMARY KEY, owner_id BIGINT NOT NULL, status TEXT)'); } catch (renameErr) { }
    }
}

function fixConfessTables() {
    for (const table of ['confess_members', 'confess_mute']) {
        try {
            query('SELECT confession FROM ' + table + ' LIMIT 1');
        } catch (err) {
            try {
                exec(`ALTER TABLE ${table} RENAME TO ${table}_old`);
                exec(`CREATE TABLE IF NOT EXISTS ${table} (guild_id BIGINT NOT NULL,user_id BIGINT NOT NULL,confession INT NOT NULL,PRIMARY KEY (guild_id,confession))`);
                exec(`INSERT OR IGNORE INTO ${table} (guild_id, user_id, confession) SELECT guild_id, user_id, member_id FROM ${table}_old`);
                exec(`DROP TABLE IF EXISTS ${table}_old`);
            } catch (renameErr) {
                try {
                    exec(`DROP TABLE IF EXISTS ${table}`);
                    exec(`ALTER TABLE ${table}_old RENAME TO ${table}`);
                } catch (restoreErr) { }
            }
        }
    }
}

function fixSpotifyTables() {
    try {
        const info = query("SELECT name FROM pragma_index_list('spotify_devices') WHERE origin = 'pk'");
        if (info.length) return;
        try {
            exec('ALTER TABLE spotify_devices RENAME TO spotify_devices_old');
            exec('CREATE TABLE IF NOT EXISTS spotify_devices (discord_id BIGINT PRIMARY KEY,device_id TEXT NOT NULL)');
            exec('INSERT OR IGNORE INTO spotify_devices (discord_id, device_id) SELECT discord_id, device_id FROM spotify_devices_old');
            exec('DROP TABLE IF EXISTS spotify_devices_old');
        } catch (err2) {
            try {
                exec('DROP TABLE IF EXISTS spotify_devices');
                exec('ALTER TABLE spotify_devices_old RENAME TO spotify_devices');
            } catch (err3) { }
        }
    } catch (err) { }
}

function fixConfigTables() {

    try {
        const info = query('SELECT "name" FROM pragma_table_info(?) WHERE name = ?', 'pingtimeout', 'timeout');
        if (!info.length) exec('ALTER TABLE pingtimeout ADD COLUMN timeout INT DEFAULT 0');
    } catch (err) {}


    for (const table of ['webhook_username', 'webhook_vanity']) {
        try {
            const info = query('SELECT "name" FROM pragma_table_info(?) WHERE name = ?', table, 'guild_id');
            if (info.length) continue;
            try {
                exec(`ALTER TABLE ${table} RENAME TO ${table}_old`);
                exec(`CREATE TABLE IF NOT EXISTS ${table} (guild_id BIGINT NOT NULL,webhook_url TEXT PRIMARY KEY,length INT,name TEXT,avatar TEXT)`);
                exec(`DROP TABLE IF EXISTS ${table}_old`);
            } catch (err2) {
                try {
                    exec(`DROP TABLE IF EXISTS ${table}`);
                    exec(`ALTER TABLE ${table}_old RENAME TO ${table}`);
                } catch (err3) {}
            }
        } catch (err) {}
    }
}


function fixEconomyTables() {
    const rebuilds = {
        company: `CREATE TABLE company (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            tag TEXT NOT NULL,
            ceo BIGINT NOT NULL,
            members TEXT DEFAULT '[]',
            privacy TEXT DEFAULT 'public',
            roles TEXT DEFAULT '{}',
            level INT DEFAULT 1,
            vault REAL DEFAULT 0,
            vault_limit REAL DEFAULT 0,
            reputation INT DEFAULT 0,
            votes INT DEFAULT 0,
            created REAL,
            description TEXT,
            icon TEXT
        )`,
        company_earnings: `CREATE TABLE company_earnings (company_id INT NOT NULL,user_id BIGINT NOT NULL,amount REAL DEFAULT 0)`,
        company_invites: `CREATE TABLE company_invites (user_id BIGINT NOT NULL,company_id INT NOT NULL,message_id BIGINT,created REAL NOT NULL)`,
        company_projects: `CREATE TABLE company_projects (name TEXT PRIMARY KEY,cost REAL DEFAULT 0,votes INT DEFAULT 0,"group" INT DEFAULT 1,emoji TEXT,description TEXT,image TEXT,earnings REAL DEFAULT 0,reputation INT DEFAULT 0)`,
        company_projects_started: `CREATE TABLE company_projects_started (company_id INT PRIMARY KEY,active BOOLEAN DEFAULT TRUE,project_name TEXT NOT NULL,money REAL DEFAULT 0,votes INT DEFAULT 0,participant TEXT DEFAULT '{}',created REAL)`,
        company_upgrades: `CREATE TABLE company_upgrades (level INT PRIMARY KEY,cost REAL DEFAULT 0,reputation INT DEFAULT 0,members INT DEFAULT 5,managers INT DEFAULT 1,earnings REAL DEFAULT 0,bonus REAL DEFAULT 0)`,
        quests: `CREATE TABLE quests (id INT PRIMARY KEY,difficult TEXT NOT NULL,name TEXT,description TEXT,mode TEXT,type TEXT,amount INT DEFAULT 0,earnings REAL DEFAULT 0)`,
        quests_user: `CREATE TABLE quests_user (user_id BIGINT PRIMARY KEY,id INT NOT NULL,difficult TEXT,amount INT DEFAULT 0,completed BOOLEAN DEFAULT FALSE)`,
        economy_investments: `CREATE TABLE economy_investments (id INT PRIMARY KEY,name TEXT NOT NULL,cost REAL DEFAULT 0,earnings REAL DEFAULT 0,days INT DEFAULT 1,description TEXT)`,
        economy_investments_started: `CREATE TABLE economy_investments_started (id INT NOT NULL,user_id BIGINT PRIMARY KEY,timestamp REAL NOT NULL,active BOOLEAN DEFAULT TRUE)`,
        economy_business_list: `CREATE TABLE economy_business_list (business_id INT PRIMARY KEY,name TEXT NOT NULL,description TEXT,cost REAL DEFAULT 0,earnings REAL DEFAULT 0,emoji TEXT,image TEXT)`,
        economy_shop_items: `CREATE TABLE economy_shop_items (guild_id BIGINT NOT NULL,role_id BIGINT NOT NULL,amount REAL NOT NULL,name TEXT NOT NULL,"limit" INT,time BIGINT)`
    };
    const probes = {
        company: 'ceo',
        company_earnings: 'amount',
        company_invites: 'message_id',
        company_projects: 'cost',
        company_projects_started: 'money',
        company_upgrades: 'cost',
        quests: 'mode',
        quests_user: 'difficult',
        economy_investments: 'cost',
        economy_investments_started: 'timestamp',
        economy_business_list: 'cost',
        economy_shop_items: 'time'
    };
    for (const [table, column] of Object.entries(probes)) {
        try { query(`SELECT ${column} FROM ${table} LIMIT 1`); continue; } catch (err) {  }
        try {
            exec(`DROP TABLE IF EXISTS ${table}`);
            exec(rebuilds[table]);
        } catch (err) {
            console.error(`table rebuild failed for ${table}:`, err.message);
        }
    }
    try { exec('CREATE INDEX IF NOT EXISTS idx_company_ceo ON company(ceo)'); } catch (err) {}
    try { exec('CREATE INDEX IF NOT EXISTS idx_company_name ON company(name)'); } catch (err) {}
}

function seedEconomyData() {

    try { run('INSERT INTO economy_config (active) SELECT TRUE WHERE NOT EXISTS (SELECT 1 FROM economy_config)'); } catch (err) {}

    const businesses = [
        [1, 'Lemonade Stand', 'A small stand selling fresh lemonade on the corner.', 25000, 500, '🍋'],
        [2, 'Food Truck', 'A roaming food truck with a loyal lunch crowd.', 100000, 1800, '🚚'],
        [3, 'Bakery', 'Fresh bread and pastries baked every morning.', 350000, 5500, '🧁'],
        [4, 'Cafe', 'A cozy cafe loved by the neighborhood.', 900000, 13000, '☕'],
        [5, 'Restaurant', 'A busy restaurant with five-star reviews.', 2500000, 32000, '🍽️'],
        [6, 'Nightclub', 'The hottest club in town, open until late.', 7000000, 80000, '🪩'],
        [7, 'Tech Startup', 'A fast-growing startup with a bold product.', 18000000, 180000, '💻'],
        [8, 'Car Dealership', 'New and used cars moving off the lot daily.', 45000000, 400000, '🚗'],
        [9, 'Airline', 'Flights connecting cities across the world.', 120000000, 950000, '✈️'],
        [10, 'Global Conglomerate', 'A massive corporation with endless revenue streams.', 400000000, 2500000, '🌍']
    ];
    for (const [id, name, description, cost, earnings, emoji] of businesses) {
        try { run('INSERT OR IGNORE INTO economy_business_list (business_id, name, description, cost, earnings, emoji) VALUES (?, ?, ?, ?, ?, ?)', id, name, description, cost, earnings, emoji); } catch (err) {}
    }

    const investments = [
        [1, 'Savings Bond', 50000, 60000, 1, 'A safe government bond with modest returns.'],
        [2, 'Startup Fund', 500000, 650000, 2, 'Seed funding for a promising new startup.'],
        [3, 'Real Estate', 5000000, 7000000, 3, 'A property development project in the city center.'],
        [4, 'Tech Stock', 20000000, 30000000, 4, 'Shares in a booming technology company.'],
        [5, 'Crypto Portfolio', 75000000, 120000000, 5, 'A diversified portfolio of digital assets.'],
        [6, 'Hedge Fund', 300000000, 520000000, 7, 'An aggressive hedge fund managed by top traders.']
    ];
    for (const [id, name, cost, earnings, days, description] of investments) {
        try { run('INSERT OR IGNORE INTO economy_investments (id, name, cost, earnings, days, description) VALUES (?, ?, ?, ?, ?, ?)', id, name, cost, earnings, days, description); } catch (err) {}
    }

    const upgrades = [
        [1, 250000, 0, 5, 1, 500, 10000],
        [2, 1000000, 5, 7, 2, 750, 25000],
        [3, 3000000, 15, 10, 3, 1100, 50000],
        [4, 8000000, 30, 13, 4, 1600, 100000],
        [5, 20000000, 60, 16, 5, 2400, 250000],
        [6, 50000000, 120, 20, 6, 3500, 500000],
        [7, 120000000, 250, 25, 7, 5000, 1000000],
        [8, 300000000, 500, 30, 8, 7500, 2000000],
        [9, 750000000, 1000, 40, 9, 11000, 5000000],
        [10, 2000000000, 2500, 50, 10, 16000, 10000000]
    ];
    for (const [level, cost, reputation, members, managers, earnings, bonus] of upgrades) {
        try { run('INSERT OR IGNORE INTO company_upgrades (level, cost, reputation, members, managers, earnings, bonus) VALUES (?, ?, ?, ?, ?, ?, ?)', level, cost, reputation, members, managers, earnings, bonus); } catch (err) {}
    }

    const projects = [
        ['Garage Office', 100000, 5, 1, '🏠', 'Set up a garage office for the team.', 150000, 1],
        ['Coffee Machine', 250000, 10, 1, '☕', 'A premium coffee machine keeps everyone productive.', 400000, 2],
        ['Team Offsite', 750000, 20, 2, '✈️', 'A retreat to build team spirit.', 1200000, 4],
        ['Marketing Campaign', 2000000, 40, 2, '📣', 'A big campaign to put the brand on the map.', 3200000, 7],
        ['Product Launch', 6000000, 75, 3, '🚀', 'Launch the next flagship product.', 10000000, 12],
        ['Office Tower', 15000000, 120, 3, '🏢', 'Lease a shiny new office tower.', 25000000, 20],
        ['Acquisition', 40000000, 200, 3, '🤝', 'Acquire a competing company.', 68000000, 35],
        ['Global Expansion', 100000000, 350, 4, '🌍', 'Expand operations across continents.', 175000000, 60],
        ['Space Program', 300000000, 600, 4, '🛰️', 'Fund a private space program.', 550000000, 120],
        ['World Domination', 1000000000, 1000, 4, '👑', 'The ultimate endgame project.', 2000000000, 300]
    ];
    for (const [name, cost, votes, group, emoji, description, earnings, reputation] of projects) {
        try { run('INSERT OR IGNORE INTO company_projects (name, cost, votes, "group", emoji, description, earnings, reputation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', name, cost, votes, group, emoji, description, earnings, reputation); } catch (err) {}
    }

    const quests = [
        [1, 'easy', 'Lucky Spin', 'Win a few slots games.', 'slots', 'win-game', 3, 15000],
        [2, 'easy', 'Pocket Money', 'Collect money from any source.', 'any', 'collect-money', 5000, 10000],
        [3, 'easy', 'Daily Devotee', 'Claim your daily reward.', 'daily', 'collect-money', 1, 12000],
        [4, 'medium', 'High Roller', 'Win money playing coinflip.', 'coinflip', 'win-money', 50000, 60000],
        [5, 'medium', 'Hard Worker', 'Earn money by working.', 'work', 'collect-money', 10000, 50000],
        [6, 'medium', 'Banker', 'Deposit money into your bank.', 'bank', 'deposit-bank-money', 25000, 55000],
        [7, 'hard', 'Crime Lord', 'Collect money by robbing.', 'rob', 'collect-money', 100000, 250000],
        [8, 'hard', 'Vault Keeper', 'Deposit money into the company vault.', 'vault', 'deposit-vault-money', 500000, 300000],
        [9, 'hard', 'Entrepreneur', 'Collect earnings from your business.', 'business', 'collect-money', 200000, 350000]
    ];
    for (const [id, difficult, name, description, mode, type, amount, earnings] of quests) {
        try { run('INSERT OR IGNORE INTO quests (id, difficult, name, description, mode, type, amount, earnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, difficult, name, description, mode, type, amount, earnings); } catch (err) {}
    }

    const cards = [
        ['Intern', 'business', 1], ['Clerk', 'business', 1], ['Supervisor', 'business', 2], ['Director', 'business', 3],
        ['Executive', 'business', 4], ['Chairman', 'business', 5], ['Trainee', 'lab', 1], ['Technician', 'lab', 1],
        ['Chemist', 'lab', 2], ['Researcher', 'lab', 3], ['Lead Scientist', 'lab', 4], ['Nobel Laureate', 'lab', 5],
        ['Bouncer', 'personal', 1], ['Security Guard', 'personal', 1], ['Patrol Officer', 'personal', 2],
        ['Detective', 'personal', 3], ['Special Agent', 'personal', 4], ['Chief of Security', 'personal', 5]
    ];
    cards.forEach(([name, business, stars], index) => {
        try { run('INSERT OR IGNORE INTO economy_cards (id, name, stars, business) VALUES (?, ?, ?, ?)', index + 1, name, stars, business); } catch (err) {}
    });
}

function initDatabase() {
    if (handle) return;
    ensureDataDir();
    const fresh = !fs.existsSync(DB_PATH);
    handle = new DatabaseSync(DB_PATH);
    handle.exec('PRAGMA journal_mode = WAL');
    handle.exec('PRAGMA busy_timeout = 5000');
    handle.exec('PRAGMA foreign_keys = OFF');
    handle.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    ensureColumns();
    fixTicketTables();
    fixWarnTables();
    fixPaymentTables();
    fixConfigTables();
    fixConfessTables();
    fixSpotifyTables();
    fixEconomyTables();
    try { seedEconomyData(); } catch (err) { console.error('economy seed failed:', err.message); }
    if (fresh) seedLegacyData();
    try { insertWarns(); } catch (err) { console.error('warn migration failed:', err.message); }
    try { migrateJsonData(); } catch (err) { console.error('json migration failed:', err.message); }
}

function closeDatabase() {
    if (!handle) return;
    try {
        handle.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        handle.close();
    } catch (err) {
        console.error('database close failed:', err.message);
    }
    handle = null;
    statements.clear();
}

function nextHistoryId() {
    const row = first('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM history');
    return row ? row.next : 1;
}

function nextCaseId(guildId) {
    const row = first('SELECT COALESCE(MAX(guild_id), 0) + 1 AS next FROM history WHERE server_id = ?', guildId);
    return row ? row.next : 1;
}

function addHistory(guildId, userId, moderatorId, punishment, reason, timestamp, duration, appealId) {
    const time = typeof timestamp === 'number' ? timestamp : Date.now() / 1000;
    const historyId = nextCaseId(guildId);
    run('INSERT INTO history (id, guild_id, user_id, moderator_id, server_id, punishment, duration, reason, time, appeal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        nextHistoryId(), historyId, userId, moderatorId, guildId, punishment, duration || null, reason, time, appealId || null);
    return String(historyId);
}

function getWarnings(guildId, userId) {
    const rows = query('SELECT id, moderator_id AS moderator, reason, time FROM history WHERE server_id = ? AND user_id = ? AND punishment = ? ORDER BY time ASC',
        guildId, userId, 'warn');
    return rows.map(row => ({
        id: String(row.id),
        moderator: String(row.moderator),
        reason: row.reason,
        timestamp: new Date((Number(row.time) || 0) * 1000).toISOString()
    }));
}

function addWarning(guildId, userId, moderatorId, reason, timestamp) {
    addHistory(guildId, userId, moderatorId, 'warn', reason, timestamp);
    const list = getWarnings(guildId, userId);
    return list[list.length - 1] || null;
}

function removeWarning(guildId, userId, warningId) {
    if (!warningId) {
        run('DELETE FROM history WHERE server_id = ? AND user_id = ? AND punishment = ?', guildId, userId, 'warn');
        return true;
    }
    const target = Number(warningId);
    const result = run('DELETE FROM history WHERE server_id = ? AND user_id = ? AND punishment = ? AND id = ?',
        guildId, userId, 'warn', Number.isFinite(target) ? target : -1);
    return result.changes > 0;
}

function getWarningCount(guildId, userId) {
    const row = first('SELECT COUNT(*) AS total FROM history WHERE server_id = ? AND user_id = ? AND punishment = ?',
        guildId, userId, 'warn');
    return row ? row.total : 0;
}

module.exports = {
    initDatabase,
    closeDatabase,
    query,
    first,
    run,
    exec,
    transaction,
    addHistory,
    warnStamp,
    getWarnings,
    addWarning,
    removeWarning,
    getWarningCount,
    readJSON: readJson,
    writeJSON
};
