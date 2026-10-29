const { warn, approve } = require('../../utils/context');
const { first, run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const { humanize, logging } = require('../../utils/econ');
const { humanizeTime } = require('../../utils/helpers');
const { prefix } = require('../../utils/moderation');

function calculateBonus(streak, userId) {
    const bonusPercentage = streak >= 60 ? 50 : streak >= 30 ? 15 : streak >= 14 ? 10 : streak >= 7 ? 5 : streak >= 3 ? 3 : 0;
    const donor = first('SELECT 1 AS ok FROM donor WHERE user_id = ?', userId);
    const donorBonusPercentage = donor ? 20 : 0;
    return bonusPercentage + donorBonusPercentage;
}

module.exports = {
    data: { name: 'daily', description: "Claim your daily cash", usage: ',daily' },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const check = first('SELECT cash, daily, daily_streak FROM economy WHERE user_id = ?', message.author.id);
        if (!check) return message.reply('Error: User data not found.');

        const now = Date.now();
        const lastClaim = check.daily ? new Date(Number(check.daily) * 1000) : null;
        const dailyStreak = lastClaim && (now - lastClaim.getTime()) < 2 * 86400000 ? Number(check.daily_streak) || 1 : 1;

        if (check.daily && now < Number(check.daily) * 1000) {
            const p = await prefix(message);
            const remaining = Math.ceil((Number(check.daily) * 1000 - now) / 1000);
            return warn(message, `You can run \`${p}daily\` again **in ${humanizeTime(remaining)}**`);
        }

        const config = first('SELECT daily_min, daily_max FROM economy_config WHERE active = 1')
            || first('SELECT daily_min, daily_max FROM economy_config');
        const minWin = Number(config ? config.daily_min : 500) || 500;
        const maxWin = Number(config ? config.daily_max : 1500) || 1500;

        const baseReward = minWin + Math.random() * (maxWin - minWin);
        const totalBonus = calculateBonus(dailyStreak, message.author.id);
        const totalReward = Math.round(baseReward * (1 + totalBonus / 100) * 100) / 100;

        run('UPDATE economy SET cash = cash + ?, daily_streak = ?, daily = ? WHERE user_id = ?',
            totalReward, dailyStreak, Math.floor((now + 86400000) / 1000), message.author.id);

        const bonusMessage = totalBonus > 0 ? `+${totalBonus}% Total Bonus` : '';
        logging(message.author.id, totalReward, 'collect', 'daily');
        return approve(message, `You have claimed **${humanize(totalReward)}** 💵 ${bonusMessage}`.trim());
    }
};
