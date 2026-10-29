const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

function isValidZone(zone) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: zone });
        return true;
    } catch (err) {
        return false;
    }
}

function dateInZone(zone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(new Date());
    const get = (type) => (parts.find((p) => p.type === type) || {}).value || '';
    return {
        weekday: get('weekday'),
        month: get('month'),
        day: get('day'),
        year: get('year'),
        hour: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`.toUpperCase()
    };
}

async function fetchZoneForLocation(location) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
            headers: { 'User-Agent': 'discord-bot' }
        });
        const results = await res.json();
        if (!results.length) return null;
        const { lat, lon } = results[0];
        const res2 = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
        const data = await res2.json();
        if (!data || !data.timeZone) return null;
        return data.timeZone;
    } catch (err) {
        return null;
    }
}

module.exports = {
    data: { name: 'timezone', description: 'View your current time or somebody elses', usage: ',timezone [member]' },
    aliases: ['tz'],
    cooldown: 5,
    subcommands: ['check', 'set', 'unset', 'list'],
    subUsages: {
        check: ',timezone check Vienna',
        set: ',timezone set Europe/Vienna',
        unset: ',timezone unset',
        list: ',timezone list'
    },

    async execute(message, args) {
        const member = message.mentions.members.first() || message.member;
        const row = first('SELECT zone FROM timezone WHERE user_id = ?', member.id);
        if (!row) {
            return warn(message, member.id === message.author.id
                ? 'You don\'t have a timezone set\n> Use `,timezone set Europe/Vienna`'
                : `${member} doesn't have a timezone set`);
        }
        const d = dateInZone(row.zone);
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                description: `🕑 ${message.author}: **${member.id === message.author.id ? 'Your' : `${member.user.username}'s`}** current date **${d.weekday}, ${d.month} ${ordinal(d.day.replace(/\D/g, ''))} ${d.year}**`
            }]
        });
    },

    subs: {
        check: {
            aliases: [],
            data: { name: 'timezone check', description: 'Check the current time for a specific location', usage: ',timezone check Vienna' },
            execute: async (message, args) => {
                const location = args.join(' ').trim();
                if (!location) return warn(message, 'You must provide a location\n> Usage: `,timezone check Vienna`');
                const zone = await fetchZoneForLocation(location);
                if (!zone) return warn(message, 'Invalid location provided. Please try again with a valid city or region.');
                const d = dateInZone(zone);
                return message.reply({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        title: `Current Time in ${location.replace(/\b\w/g, (c) => c.toUpperCase())}`,
                        description: `🕑 ${d.weekday}, ${d.month} ${ordinal(d.day.replace(/\D/g, ''))} - **${d.hour}**`
                    }]
                });
            }
        },
        set: {
            aliases: [],
            data: { name: 'timezone set', description: 'Set your timezone', usage: ',timezone set Europe/Vienna' },
            execute: async (message, args) => {
                const zone = args.join(' ').trim();
                if (!zone) return warn(message, 'You must provide a timezone\n> Usage: `,timezone set Europe/Vienna`');
                if (!isValidZone(zone)) {
                    return warn(message, 'That is not a valid timezone\n> Use IANA names like `Europe/Vienna` or `America/New_York`');
                }
                const row = first('SELECT zone FROM timezone WHERE user_id = ?', message.author.id);
                if (row) {
                    run('UPDATE timezone SET zone = ? WHERE user_id = ?', zone, message.author.id);
                } else {
                    run('INSERT INTO timezone (user_id, zone) VALUES (?, ?)', message.author.id, zone);
                }
                const d = dateInZone(zone);
                return approve(message, `Saved your timezone as **${zone}**\n> 🕑 Current date: **${d.weekday}, ${d.month} ${ordinal(d.day.replace(/\D/g, ''))} ${d.year}**`);
            }
        },
        unset: {
            aliases: [],
            data: { name: 'timezone unset', description: 'Unset your timezone', usage: ',timezone unset' },
            execute: async (message) => {
                const row = first('SELECT zone FROM timezone WHERE user_id = ?', message.author.id);
                if (!row) return warn(message, 'You don\'t have a timezone set');
                run('DELETE FROM timezone WHERE user_id = ?', message.author.id);
                return approve(message, 'You succesfully deleted your timezone');
            }
        },
        list: {
            aliases: [],
            data: { name: 'timezone list', description: "View a list of every member's timezone", usage: ',timezone list' },
            execute: async (message) => {
                const ids = [...message.guild.members.cache.keys()];
                if (!ids.length) return warn(message, 'No one has defined a timezone.');
                const results = [];
                for (let i = 0; i < ids.length; i += 500) {
                    const chunk = ids.slice(i, i + 500);
                    const placeholders = chunk.map(() => '?').join(', ');
                    results.push(...query(`SELECT user_id, zone FROM timezone WHERE user_id IN (${placeholders})`, ...chunk));
                }
                if (!results.length) return warn(message, 'No one has defined a timezone.');
                const entries = results.map((result) => {
                    const member = message.guild.members.cache.get(result.user_id);
                    return `${member || `<@${result.user_id}>`} - **${result.zone}**`;
                });
                const { paginate } = require('../../utils/context');
                return paginate(message, entries, 'Timezones', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
