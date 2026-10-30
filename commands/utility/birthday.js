const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { paginate } = require('../../utils/context');

const MONTHS = { 1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December' };
const MONTH_INDEX = Object.fromEntries(Object.entries(MONTHS).map(([index, name]) => [name.toLowerCase(), Number(index)]));
const BD_COLOR = 0xDEA5A4;

function ordinal(n) {
    const num = Number(n);
    if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
    switch (num % 10) {
        case 1: return `${num}st`;
        case 2: return `${num}nd`;
        case 3: return `${num}rd`;
        default: return `${num}th`;
    }
}

function daysInMonth(monthIndex) {
    return new Date(Date.UTC(2024, monthIndex, 0)).getUTCDate();
}

function humanizeDays(days) {
    if (days <= 0) return 'today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    const rest = days % 30;
    return `${months} month${months === 1 ? '' : 's'}${rest ? ` ${rest} days` : ''}`;
}

function nextBirthday(month, day, now) {
    let next = new Date(now.getFullYear(), month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
    return next;
}

module.exports = {
    data: { name: 'birthday', description: "View your birthday or somebody else's", usage: ',birthday [user]' },
    aliases: ['bday'],
    cooldown: 5,
    subcommands: ['set', 'unset', 'list', 'globallist', 'reward'],
    subUsages: {
        set: ',birthday set March 20 2004',
        unset: ',birthday unset',
        list: ',birthday list',
        globallist: ',birthday globallist',
        reward: ',birthday reward <set|unset|view>'
    },

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const check = first('SELECT * FROM birthday WHERE user_id = ?', user.id);
        if (!check) {
            return warn(message, user.id === message.author.id
                ? '**You** don\'t have a **birthday** configured'
                : `**${user.username}** doesn't have a **birthday** configured`);
        }
        const now = new Date();
        const next = nextBirthday(check.month, check.day, now);
        const days = Math.ceil((next - now) / 86400000);
        const formattedDate = `${MONTHS[check.month]} ${check.day}${check.year ? `, ${check.year}` : ''}`;
        const self = user.id === message.author.id;
        if (check.year) {
            const age = next.getFullYear() - check.year;
            return message.reply({
                embeds: [{
                    color: BD_COLOR,
                    description: `🎂 ${message.author}: ${self ? '**Your**' : `**${user.username}**`} birthday is **${formattedDate}**. That's **${humanizeDays(days)}** and ${self ? 'you' : 'he'} will be **${age}** years old.`
                }]
            });
        }
        return message.reply({
            embeds: [{
                color: BD_COLOR,
                description: `🎂 ${message.author}: **${user.username}'s** birthday is **${formattedDate}**. That's **${humanizeDays(days)}**.`
            }]
        });
    },

    subs: {
        set: {
            aliases: [],
            data: { name: 'birthday set', description: 'Set your birthday', usage: ',birthday set March 20 2004' },
            execute: async (message, args) => {
                const parts = args.join(' ').trim().split(/\s+/);
                if (parts.length < 2 || parts.length > 3) {
                    return warn(message, 'Invalid date format.\n> Please use either `March 20` or `March 20 2004`');
                }
                const month = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
                const dayRaw = parts[1];
                const yearRaw = parts[2];
                if (!(month.toLowerCase() in MONTH_INDEX)) {
                    return warn(message, 'Invalid month provided. Please try again with a valid month.');
                }
                if (!/^\d{1,2}$/.test(dayRaw)) return warn(message, 'Invalid day format. Please provide a numeric day.');
                const monthIndex = MONTH_INDEX[month.toLowerCase()];
                const day = Number(dayRaw);
                const maxDay = daysInMonth(monthIndex);
                if (day < 1 || day > maxDay) return warn(message, `Invalid day for ${month}. ${month} has ${maxDay} days.`);
                let year = null;
                if (yearRaw) {
                    if (!/^\d{4}$/.test(yearRaw)) return warn(message, 'Invalid year format. Please provide a numeric year.');
                    year = Number(yearRaw);
                    if (year < 1900 || year > 2100) return warn(message, 'Invalid year provided. Please enter a year between 1900 and 2100.');
                }
                run('INSERT INTO birthday (user_id, day, month, year) VALUES (?, ?, ?, ?) ' +
                    'ON CONFLICT (user_id) DO UPDATE SET day = excluded.day, month = excluded.month, year = excluded.year',
                    message.author.id, day, monthIndex, year);
                return message.reply({
                    embeds: [{
                        color: BD_COLOR,
                        description: `🎂 Your birthday is set to **${month} ${day}${year ? `, ${year}` : ''}**.`
                    }]
                });
            }
        },
        unset: {
            aliases: [],
            data: { name: 'birthday unset', description: 'Unset your birthday', usage: ',birthday unset' },
            execute: async (message) => {
                const check = first('SELECT * FROM birthday WHERE user_id = ?', message.author.id);
                if (!check) return warn(message, "You haven't set a birthday yet");
                run('DELETE FROM birthday WHERE user_id = ?', message.author.id);
                return approve(message, 'You succesfully deleted your birthday');
            }
        },
        list: {
            aliases: [],
            data: { name: 'birthday list', description: "View a list of every member's birthday in this server", usage: ',birthday list' },
            execute: async (message) => {
                const results = query('SELECT * FROM birthday');
                const memberIds = new Set(message.guild.members.cache.keys());
                const bdayList = results
                    .filter((result) => memberIds.has(result.user_id))
                    .map((result) => ({
                        user_id: result.user_id,
                        month: result.month,
                        day: result.day,
                        year: result.year || 9999
                    }))
                    .sort((a, b) => (a.month - b.month) || (a.day - b.day));
                const entries = bdayList
                    .filter((bday) => bday.year !== 9999)
                    .map((bday) => `<@${bday.user_id}> - ${MONTHS[bday.month]} ${bday.day}, ${bday.year}`);
                if (!entries.length) return warn(message, `There are no birthdays saved in ${message.guild.name}`);
                return paginate(message, entries, `Birthdays in ${message.guild.name}`, {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        },
        globallist: {
            aliases: ['glist'],
            data: { name: 'birthday globallist', description: "View a list of every user's birthday", usage: ',birthday globallist' },
            execute: async (message) => {
                const results = query('SELECT * FROM birthday');
                const bdayList = results
                    .map((result) => ({
                        user_id: result.user_id,
                        month: result.month,
                        day: result.day,
                        year: result.year || 9999
                    }))
                    .sort((a, b) => (a.month - b.month) || (a.day - b.day));
                const entries = bdayList
                    .filter((bday) => bday.year !== 9999)
                    .map((bday) => `<@${bday.user_id}> - ${MONTHS[bday.month]} ${bday.day}, ${bday.year}`);
                if (!entries.length) return warn(message, 'There are no birthdays saved');
                return paginate(message, entries, 'Global Birthdays', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        },
        reward: {
            aliases: [],
            data: { name: 'birthday reward', description: 'Set a reward for your birthday', usage: ',birthday reward <set|unset|view>' },
            subcommands: ['set', 'unset', 'view'],
            subUsages: {
                set: ',birthday reward set birthdayrole',
                unset: ',birthday reward unset',
                view: ',birthday reward view'
            },
            execute: async (message) => sendCard(message, module.exports.subs.reward),
            subs: {
                set: {
                    aliases: [],
                    data: { name: 'birthday reward set', description: 'Set a role as a reward for your birthday', usage: ',birthday reward set birthdayrole' },
                    execute: async (message, args) => {
                        const role = message.mentions.roles.first();
                        const raw = String(args.join(' ') || '').replace(/[<@&>]/g, '');
                        const target = role || (raw && /^\d{17,20}$/.test(raw) ? message.guild.roles.cache.get(raw) : null);
                        if (!target) return warn(message, 'You must mention a role\n> Usage: `,birthday reward set birthdayrole`');
                        run('DELETE FROM birthday_reward WHERE guild_id = ?', message.guild.id);
                        run('INSERT INTO birthday_reward (guild_id, role_id) VALUES (?, ?)',
                            message.guild.id, target.id);
                        return approve(message, `Set **${target.name}** as your birthday reward`);
                    }
                },
                unset: {
                    aliases: [],
                    data: { name: 'birthday reward unset', description: 'Unset your birthday reward', usage: ',birthday reward unset' },
                    execute: async (message) => {
                        const role = first('SELECT role_id FROM birthday_reward WHERE guild_id = ?', message.guild.id);
                        if (!role) return warn(message, "You haven't set a birthday reward yet");
                        run('DELETE FROM birthday_reward WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'You succesfully deleted your birthday reward');
                    }
                },
                view: {
                    aliases: [],
                    data: { name: 'birthday reward view', description: 'View your birthday reward', usage: ',birthday reward view' },
                    execute: async (message) => {
                        const row = first('SELECT role_id FROM birthday_reward WHERE guild_id = ?', message.guild.id);
                        if (row) {
                            const role = message.guild.roles.cache.get(String(row.role_id));
                            if (role) return approve(message, `Your birthday reward is **${role}**`);
                        }
                        return warn(message, "You haven't set a birthday reward yet");
                    }
                }
            }
        }
    }
};
