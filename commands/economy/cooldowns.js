const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { first } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const { resolveUser } = require('../../utils/moderation');
const E = require('../../utils/econ');

function formatCd(seconds, isVote) {
    if (!seconds) return isVote ? '[`Available`](https://top.gg/bot/1242930981967757452/vote)' : '`Available`';
    if (Date.now() / 1000 > seconds) return isVote ? '[`Available`](https://top.gg/bot/1242930981967757452/vote)' : '`Available`';
    return `<t:${Math.floor(seconds)}:R>`;
}

module.exports = {
    data: { name: 'cooldowns', description: 'Check the cooldowns for all economy commands', usage: ',cooldowns [user]' },
    aliases: ['cd'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        let member = message.member;
        const mentioned = resolveUser(message, args[0]);
        if (mentioned) member = message.guild.members.cache.get(mentioned.id) || member;
        const userId = member.id;

        const row = E.ensureAccount(userId);
        const topgg = first('SELECT vote_until FROM votes WHERE user_id = ?', userId);
        const config = first('SELECT * FROM economy_config WHERE active = 1') || {};
        const clean = value => E.cleanHumanize(value);
        const range = (min, max) => `${clean(min)} - ${clean(max)}`;

        const fields = [
            { name: 'Beg (1 Minute)', value: `${formatCd(row.beg)}\n${EMOJIS.REPLY} ${range(config.beg_min ?? 100, config.beg_max ?? 500)} 💵`, inline: true },
            { name: 'Bonus (15 Minutes)', value: `${formatCd(row.bonus)}\n${EMOJIS.REPLY} ${range(config.bonus_min ?? 50, config.bonus_max ?? 200)} 💵`, inline: true },
            { name: 'Work (1 Hour)', value: `${formatCd(row.work)}\n${EMOJIS.REPLY} ${range(config.work_min ?? 200, config.work_max ?? 800)} 💵`, inline: true },
            { name: 'Slut (1 Hour)', value: `${formatCd(row.slut)}\n${EMOJIS.REPLY} ${range(config.slut_min ?? 50, config.slut_max ?? 300)} 💵`, inline: true },
            { name: 'Rob (3 Hours)', value: `${formatCd(row.rob)}\n${EMOJIS.REPLY} 10% from target 💵`, inline: true },
            { name: 'Vote (12 Hours)', value: `${formatCd(topgg ? topgg.vote_until : null, true)}\n${EMOJIS.REPLY} ${clean(config.vote ?? 2500)} 💵`, inline: true },
            { name: 'Daily (24 Hours)', value: `${formatCd(row.daily)}\n${EMOJIS.REPLY} ${range(config.daily_min ?? 500, config.daily_max ?? 1500)} 💵`, inline: true }
        ];

        const business = E.getUserBusiness(userId);
        if (business) {
            const systemBusiness = E.getSystemBusinessById(business.business_id);
            if (systemBusiness) {
                const pending = E.businessEarning(userId, business.last_collected, systemBusiness.earnings) <= 0;
                const businessCd = pending ? business.last_collected + 3600 : null;
                const used = E.getUsedCard(userId, 'business');
                const earnings = used && pending ? systemBusiness.earnings * used.multiplier : systemBusiness.earnings;
                fields.push({ name: 'Business (1 Hour)', value: `${formatCd(businessCd)}\n${EMOJIS.REPLY} ${clean(earnings)} 💵`, inline: true });
            }
        }

        const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
        if (lab && lab.last_collected && (Date.now() / 1000 - lab.last_collected) < 3600) {
            const labCd = lab.last_collected + 3600;
            const { earningsPerHour } = E.labEarnings(userId, lab.upgrade_state);
            fields.push({ name: 'Lab (1 Hour)', value: `${formatCd(labCd)}\n${EMOJIS.REPLY} ${clean(earningsPerHour)} 💵`, inline: true });
        }

        return message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                author: { name: `${member.user.username}'s cooldowns` },
                fields
            })]
        });
    }
};
