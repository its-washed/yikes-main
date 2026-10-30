const { first, query, run, transaction } = require('./database');

function loadPremium() {
    return {
        premiumUsers: query('SELECT user_id FROM premium_user').map(row => String(row.user_id)),
        premiumCommands: query('SELECT command FROM premium_command').map(row => String(row.command))
    };
}

function savePremium(data) {
    const users = (data && data.premiumUsers) || [];
    const commands = (data && data.premiumCommands) || [];
    transaction(() => {
        run('DELETE FROM premium_user');
        run('DELETE FROM premium_command');
        for (const userId of users) run('INSERT OR IGNORE INTO premium_user (user_id) VALUES (?)', userId);
        for (const name of commands) run('INSERT OR IGNORE INTO premium_command (command) VALUES (?)', String(name).toLowerCase());
    });
}

function isPremium(userId) {
    return Boolean(first('SELECT 1 AS ok FROM premium_user WHERE user_id = ?', userId));
}

function addPremium(userId) {
    run('INSERT OR IGNORE INTO premium_user (user_id) VALUES (?)', userId);
}

function removePremium(userId) {
    run('DELETE FROM premium_user WHERE user_id = ?', userId);
}

function isPremiumCommand(name) {
    return Boolean(first('SELECT 1 AS ok FROM premium_command WHERE command = ?', String(name).toLowerCase()));
}

function addPremiumCommand(name) {
    run('INSERT OR IGNORE INTO premium_command (command) VALUES (?)', String(name).toLowerCase());
}

function removePremiumCommand(name) {
    run('DELETE FROM premium_command WHERE command = ?', String(name).toLowerCase());
}

async function needPremium(message) {
    const { warn } = require('./context');
    if (first('SELECT 1 AS ok FROM premium WHERE guild_id = ?', message.guild.id)) return true;
    await warn(message, 'You need to have **premium** to use this command');
    return false;
}

module.exports = { loadPremium, savePremium, isPremium, addPremium, removePremium, isPremiumCommand, addPremiumCommand, removePremiumCommand, needPremium };
