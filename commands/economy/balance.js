const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { query, first } = require('../../utils/database');
const E = require('../../utils/econ');

function money(value) {
    const n = Number(value) || 0;
    const ip = Math.trunc(n).toLocaleString('en-US');
    if (ip.replace(/,/g, '').length <= 10) {
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const omitted = ip.replace(/,/g, '').length - 10;
    return `${ip.slice(0, 10)}... (+${omitted})`;
}

function businessEarnings(userId) {
    const business = E.getUserBusiness(userId);
    if (!business) return 'N/A';
    const systemBusiness = E.getSystemBusinessById(business.business_id);
    return money(E.businessEarning(userId, business.last_collected, systemBusiness ? (systemBusiness.earnings || 0) : 0));
}

function laboratoryEarnings(userId) {
    const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
    if (!lab) return 'N/A';
    const now = Date.now() / 1000;
    const timePassed = now - Number(lab.last_collected || now);
    const { earningsPerHour, earningsCap } = E.labEarnings(userId, lab.upgrade_state || 0);
    if (timePassed < 3600) return money(0);
    let earnings = earningsPerHour * Math.floor(timePassed / 3600);
    if (earnings > earningsCap) earnings = earningsCap;
    return money(earnings);
}

function companyEarnings(userId) {
    const company = E.getUserCompany(userId);
    if (!company) return 'N/A';
    const earnings = first('SELECT amount FROM company_earnings WHERE user_id = ? AND company_id = ?', userId, company.id);
    return money(earnings ? earnings.amount : 0);
}

function rankOf(userId, total) {
    const rows = query('SELECT cash, card FROM economy');
    const totals = rows.map(row => (Number(row.cash) || 0) + (Number(row.card) || 0));
    totals.push(total);
    totals.sort((a, b) => b - a);
    return { rank: totals.indexOf(total) + 1, count: totals.length };
}

module.exports = {
    data: { name: 'balance', description: "Check someone's balance and rank", usage: ',balance its_washed', params: ['[user]'] },
    aliases: ['bal'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const row = E.econRow(target.id);
        if (!row) return warn(message, "Member doesn't have any **money**");

        const total = (Number(row.cash) || 0) + (Number(row.card) || 0);
        const { rank, count } = rankOf(target.id, total);

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                author: {
                    name: `${target.username || target.tag}'s balance`,
                    iconURL: target.displayAvatarURL ? target.displayAvatarURL({ size: 256 }) : undefined
                },
                fields: [
                    { name: '\ud83d\udcb5 Cash', value: money(row.cash), inline: true },
                    { name: '\ud83d\udcb3 Card', value: `${money(row.card)} / ${money(row.item_bank)}`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '\ud83c\udfdb\ufe0f Business', value: businessEarnings(target.id), inline: true },
                    { name: '\ud83e\uddea Laboratory', value: laboratoryEarnings(target.id), inline: true },
                    { name: '\ud83d\udcbc Company', value: companyEarnings(target.id), inline: true }
                ],
                footer: { text: `Rank #${rank} out of ${count}` }
            })]
        });
    }
};
