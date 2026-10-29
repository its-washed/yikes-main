const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn, approve } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

function calculateBonus(streak, userId) {
    const donor = Boolean(first('SELECT 1 AS ok FROM donor WHERE user_id = ?', userId));
    let bonus = 0;
    if (streak >= 60) bonus = 50;
    else if (streak >= 30) bonus = 15;
    else if (streak >= 14) bonus = 10;
    else if (streak >= 7) bonus = 5;
    else if (streak >= 3) bonus = 3;
    return bonus + (donor ? 20 : 0);
}

module.exports = {
    permission: "donator",
    data: { name: 'collectall', description: "Collect all available earnings from your business, laboratory, daily, beg, bonus, work, slut, and company projects", usage: ',collectall' },
    aliases: [],
    cooldown: 10,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const userId = message.author.id;
        const row = E.ensureAccount(userId);
        const now = Date.now() / 1000;
        const botId = client && client.user ? client.user.id : userId;
        const config = first('SELECT * FROM economy_config WHERE active = 1') || {};
        let total = 0;
        const details = [];

        const business = E.getUserBusiness(userId);
        if (business) {
            const systemBusiness = E.getSystemBusinessById(business.business_id);
            if (systemBusiness) {
                const earning = E.businessEarning(userId, business.last_collected, systemBusiness.earnings);
                if (earning > 0) {
                    run('UPDATE economy_business SET last_collected = ? WHERE user_id = ?', now, userId);
                    total += earning;
                    E.addCollectMoney(userId, 'business', earning);
                    E.logging(userId, earning, 'collect', 'business');
                    E.loggingBusiness(userId, botId, earning, 'collect', systemBusiness.business_id);
                    details.push(`- Business: **${E.humanize(earning)}** 💵`);
                }
            }
        }

        const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
        if (lab) {
            const upgradeState = lab.upgrade_state || 0;
            let ampoules = lab.ampoules || 0;
            const timePassed = now - (lab.last_collected || now);
            let collectAllowed = true;
            if (upgradeState >= 16) {
                const used = E.getUsedCard(userId, 'lab');
                const stars = used ? used.stars : 0;
                if (!stars) {
                    collectAllowed = false;
                    details.push('- Lab: **No card equipped**');
                } else {
                    if (upgradeState >= 16 && upgradeState <= 19 && stars < 2) {
                        collectAllowed = false;
                        details.push('- Lab: **Card with 2 stars or more required**');
                    } else if (upgradeState >= 21 && upgradeState <= 29 && stars < 3) {
                        collectAllowed = false;
                        details.push('- Lab: **Card with 3 stars or more required**');
                    } else if (upgradeState >= 31 && upgradeState <= 39 && stars < 4) {
                        collectAllowed = false;
                        details.push('- Lab: **Card with 4 stars or more required**');
                    } else if (upgradeState >= 41 && upgradeState <= 49 && stars < 5) {
                        collectAllowed = false;
                        details.push('- Lab: **Card with 5 stars or more required**');
                    }
                }
            }
            if (timePassed >= 3600 && collectAllowed) {
                const used = E.getUsedCard(userId, 'lab');
                let storage = used && used.storage ? Number(used.storage) : 6;
                let hoursPassed = Math.min(Math.floor(timePassed / 3600), Math.floor(storage));
                const ampoulesNeeded = hoursPassed * 5;
                const { earningsPerHour, earningsCap } = E.labEarnings(userId, upgradeState);
                let labEarnings = earningsPerHour * hoursPassed;
                if (labEarnings > earningsCap) labEarnings = earningsCap;
                const costFor100 = Math.trunc(earningsPerHour * 12 * 0.20);
                const ampouleCost = costFor100 / 100;
                const toBuy = Math.max(0, ampoulesNeeded - ampoules);
                const totalCost = Math.trunc(ampouleCost * toBuy);
                if (toBuy > 0 && labEarnings >= totalCost) {
                    labEarnings -= totalCost;
                    ampoules += toBuy;
                    run('UPDATE economy_lab SET ampoules = ampoules + ? WHERE user_id = ?', toBuy, userId);
                    details.push(`- Purchased ${toBuy} ampoules for **${E.humanize(totalCost)}** 💵`);
                }
                if (ampoules >= ampoulesNeeded) {
                    total += labEarnings;
                    run('UPDATE economy_lab SET last_collected = ?, ampoules = ampoules - ? WHERE user_id = ?', now, ampoulesNeeded, userId);
                    E.addCollectMoney(userId, 'lab', labEarnings);
                    E.logging(userId, labEarnings, 'collect', 'lab');
                    E.loggingLab(userId, botId, labEarnings, 'collect', upgradeState);
                    details.push(`- Lab: **${E.humanize(labEarnings)}** 💵`);
                }
            }
        }

        if (!row.beg || now >= row.beg) {
            if (!((row.cash + row.card) > 100000)) {
                const begEarnings = (config.beg_min ?? 100) + Math.random() * ((config.beg_max ?? 500) - (config.beg_min ?? 100));
                total += begEarnings;
                details.push(`- Beg: **${E.humanize(begEarnings)}** 💵`);
                E.addCollectMoney(userId, 'beg', begEarnings);
                E.logging(userId, begEarnings, 'collect', 'beg');
                run('UPDATE economy SET beg = ? WHERE user_id = ?', Math.floor(now + 60), userId);
            }
        }

        if (!row.bonus || now >= row.bonus) {
            const bonusEarnings = Math.floor((config.bonus_min ?? 50) + Math.random() * ((config.bonus_max ?? 200) - (config.bonus_min ?? 50) + 1));
            total += bonusEarnings;
            details.push(`- Bonus: **${E.humanize(bonusEarnings)}** 💵`);
            E.addCollectMoney(userId, 'bonus', bonusEarnings);
            E.logging(userId, bonusEarnings, 'collect', 'bonus');
            run('UPDATE economy SET bonus = ? WHERE user_id = ?', Math.floor(now + 900), userId);
        }

        if (!row.work || now >= row.work) {
            const company = E.getUserCompany(userId);
            let workEarnings;
            if (company) {
                workEarnings = E.getLevelInfo(company.level).earnings;
            } else {
                const min = config.work_min ?? 200;
                const max = config.work_max ?? 800;
                workEarnings = Math.round((min + Math.random() * (max - min)) * 100) / 100;
            }
            total += workEarnings;
            details.push(`- Work: **${E.humanize(workEarnings)}** 💵`);
            E.addCollectMoney(userId, 'work', workEarnings);
            E.logging(userId, workEarnings, 'collect', 'work');
            run('UPDATE economy SET work = ? WHERE user_id = ?', Math.floor(now + 3600), userId);
        }

        if (!row.slut || now >= row.slut) {
            const min = config.slut_min ?? 50;
            const max = config.slut_max ?? 300;
            const slutEarnings = Math.round((min + Math.random() * (max - min)) * 100) / 100;
            total += slutEarnings;
            details.push(`- Slut: **${E.humanize(slutEarnings)}** 💵`);
            E.addCollectMoney(userId, 'slut', slutEarnings);
            E.logging(userId, slutEarnings, 'collect', 'slut');
            run('UPDATE economy SET slut = ? WHERE user_id = ?', Math.floor(now + 3600), userId);
        }

        const lastDaily = row.daily || 0;
        let streak;
        if (lastDaily > 0) {
            streak = (now - lastDaily) / 86400 < 2 ? (row.daily_streak || 0) + 1 : 1;
        } else {
            streak = 1;
        }
        if (!row.daily || now >= row.daily) {
            const min = config.daily_min ?? 500;
            const max = config.daily_max ?? 1500;
            let dailyEarnings = Math.round((min + Math.random() * (max - min)) * 100) / 100;
            const bonusPercentage = calculateBonus(streak, userId);
            dailyEarnings *= (1 + bonusPercentage / 100);
            total += dailyEarnings;
            details.push(`- Daily: **${E.humanize(dailyEarnings)}** 💵 (+${bonusPercentage}% Bonus)`);
            E.addCollectMoney(userId, 'daily', dailyEarnings);
            E.logging(userId, dailyEarnings, 'collect', 'daily');
            run('UPDATE economy SET daily = ?, daily_streak = ? WHERE user_id = ?', Math.floor(now + 86400), streak, userId);
        }

        const company = E.getUserCompany(userId);
        if (company) {
            const earnings = first('SELECT * FROM company_earnings WHERE company_id = ? AND user_id = ?', company.id, userId);
            if (earnings && earnings.amount > 0) {
                total += earnings.amount;
                run('UPDATE company_earnings SET amount = 0 WHERE company_id = ? AND user_id = ?', company.id, userId);
                E.addCollectMoney(userId, 'company', earnings.amount);
                E.logging(userId, earnings.amount, 'collect', 'company');
                details.push(`- Company Project: **${E.humanize(earnings.amount)}** 💵`);
            }
        }

        if (total > 0) {
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', total, userId);
            return approve(message, `Successfully collected **${E.humanize(total)}** 💵\n${details.join('\n')}`);
        }
        return warn(message, 'No earnings available to collect.');
    }
};
