const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

function money(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function parseAmount(token, balance) {
    const text = String(token).trim();
    const lower = text.toLowerCase();
    const multipliers = { k: 1000, m: 1000000, b: 1000000000 };

    if (lower === 'all') return { amount: balance };
    if (lower === 'half') return { amount: round2(balance / 2) };
    if (lower.endsWith('%')) {
        const percent = Number(lower.slice(0, -1));
        if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
            return { error: 'Percentage must be between 1% and 100%' };
        }
        return { amount: round2(balance * (percent / 100)) };
    }
    const match = /^(\d+(?:\.\d+)?)([kmb])?$/i.exec(text);
    if (!match) return { error: `**${text}** is **not** a number` };
    if ((match[1].split('.')[1] || '').length > 2) {
        return { error: 'The number **cannot** have more than **2** decimals' };
    }
    return { amount: round2(Number(match[1]) * (match[2] ? multipliers[match[2].toLowerCase()] : 1)) };
}

module.exports = {
    data: { name: 'withdraw', description: 'Withdraw card money to cash', usage: ',withdraw 125', params: ['amount'] },
    aliases: ['with'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const row = first('SELECT cash, card FROM economy WHERE user_id = ?', message.author.id);
        if (!row) return warn(message, 'You do **not** have an economy account created.');

        const cash = Number(row.cash) || 0;
        const card = Number(row.card) || 0;

        if (card === 0) return warn(message, "You don't have any money on your **card** to use.");
        if (card < 0) return warn(message, 'Your balance is negative dude :skull:');
        if (!args[0]) return warn(message, 'You do **not** have enough arguments to run this command');

        const parsed = parseAmount(args[0], card);
        if (parsed.error) return warn(message, parsed.error);
        const amount = parsed.amount;

        if (amount <= 0) return warn(message, "You can't use **0** or a negative amount 💳");
        if (card < amount) return warn(message, "You don't have enough money to withdraw");

        run('UPDATE economy SET cash = ?, card = ? WHERE user_id = ?', round2(cash + amount), round2(card - amount), message.author.id);
        E.logging(message.author.id, amount, 'withdraw', 'bank');

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.ECONOMY,
                description: `💰 ${message.author}: Withdrew **${money(amount)}** 💳`
            })]
        });
    }
};
