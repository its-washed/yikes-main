const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needManager, staffLog } = require('../../utils/staff');

const CASH = '💵';

function humanize(amount) {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function economyLog(userId, amount, action, type) {
    run('INSERT INTO economy_logs (user_id, amount, action, type, created) VALUES (?, ?, ?, ?, ?)',
        userId, amount, action, type, Date.now() / 1000);
}

async function change(message, args, client, mode) {
    if (!await needManager(message)) return;
    const type = String(args[0] || '').toLowerCase();
    if (type !== 'cash' && type !== 'card') return warn(message, "Please specify either 'cash' or 'card'.");
    const user = message.mentions.users.first() || await message.client.users.fetch(String(args[1] || '').replace(/[<@!>]/g, '')).catch(() => null);
    const amount = parseFloat(args[2]);
    if (!user || !Number.isFinite(amount)) return warn(message, `Usage: \`money ${mode} <${type === 'cash' ? 'cash' : 'card|cash'}> <user> <amount>\``);
    const check = first('SELECT cash, card FROM economy WHERE user_id = ?', user.id);
    if (!check) return warn(message, `**${user.username}** not found in the economy database.`);

    let newAmount;
    if (mode === 'add') newAmount = Number((Number(check[type]) + amount).toFixed(2));
    else if (mode === 'remove') {
        newAmount = Number((Number(check[type]) - amount).toFixed(2));
        if (newAmount < 0) return warn(message, `**${user.username}** does not have enough ${type}.`);
    } else newAmount = Number(amount.toFixed(2));

    run(`UPDATE economy SET ${type} = ? WHERE user_id = ?`, newAmount, user.id);
    const verb = mode === 'add' ? 'Added' : mode === 'remove' ? 'Removed' : 'Set';
    const text = `${verb} **${humanize(amount)}** ${CASH} ${type} to ${user} (\`${user.id}\`)`;
    await staffLog(client, message.author, text, 'money');
    economyLog(user.id, amount, mode === 'add' ? 'added' : mode === 'remove' ? 'removed' : 'set', type);
    if (mode === 'set') return approve(message, `Set ${user}'s ${type} to **${humanize(newAmount)}** ${CASH}`);
    return approve(message, `${verb} **${humanize(amount)}** ${CASH} ${type} ${mode === 'add' ? 'to' : 'from'} ${user}`);
}

module.exports = {
    permission: "bot moderator",
    data: { name: 'money', description: 'Money commands', usage: ',money <add|remove|set>' },
    aliases: [],
    cooldown: 0,
    subcommands: ['add', 'remove', 'set'],
    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: add, remove, set');
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'money add', description: 'Add money to a given economy user', usage: ',money add cash its_washed 125' },
            execute: async (message, args, client) => change(message, args, client, 'add')
        },
        remove: {
            aliases: [],
            data: { name: 'money remove', description: 'Remove money from a given economy user', usage: ',money remove cash its_washed 125' },
            execute: async (message, args, client) => change(message, args, client, 'remove')
        },
        set: {
            aliases: [],
            data: { name: 'money set', description: 'Set the money of a given economy user to a specific amount', usage: ',money set cash its_washed 125' },
            execute: async (message, args, client) => change(message, args, client, 'set')
        }
    }
};
