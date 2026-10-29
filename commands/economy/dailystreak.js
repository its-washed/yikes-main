const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { Paginator } = require('../../utils/pagination');
const { first } = require('../../utils/database');
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

function monthCalendar(year, month, startOfStreak, today) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    let out = 'Mo Tu We Th Fr Sa Su\n';
    out += '\u2b1b'.repeat(firstWeekday);
    let counter = firstWeekday;
    for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(year, month - 1, day);
        const marked = current >= startOfStreak && current <= today;
        out += marked ? '\ud83d\udfe9' : '\u2b1c';
        counter += 1;
        if (counter % 7 === 0) {
            out += '\n';
            counter = 0;
        }
    }
    if (counter !== 0) out += '\n';
    return out;
}

module.exports = {
    data: { name: 'dailystreak', description: 'Get your daily streak with a calendar', usage: ',dailystreak [user]' },
    aliases: ['dstreak', 'ds'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        let target = message.author;
        if (message.mentions && message.mentions.users && message.mentions.users.first()) {
            target = message.mentions.users.first();
        }

        const row = first('SELECT daily_streak FROM economy WHERE user_id = ?', target.id);
        const streak = row && row.daily_streak ? row.daily_streak : 0;
        if (!streak) {
            return warn(message, `You don't have a daily streak, start one with **${require('../../utils/moderation').prefix(message)}daily**`);
        }

        const totalPercentage = calculateBonus(streak, target.id);
        const today = new Date();
        const startOfStreak = new Date(today.getTime() - (streak - 1) * 86400000);

        const pages = [];
        for (let offset = 0; offset < 12; offset++) {
            const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
            const calendarStr = monthCalendar(d.getFullYear(), d.getMonth() + 1, startOfStreak, today);
            pages.push({
                [require('../../utils/embeds').PRESERVE]: true,
                color: COLORS.NEUTRAL,
                title: 'Your daily streak',
                author: { name: target.username },
                description: `**Streak:** ${streak} day(s)\n**Bonus:** ${totalPercentage}%\n\n**Calendar:**\n**\`${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}\`**\n\`\`\`\n${calendarStr}\`\`\``
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        const components = pages.length > 1 ? [paginator.buildRow()] : [];
        const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
        if (pages.length > 1) await paginator.start(message.channel, sent);
        return sent;
    }
};
