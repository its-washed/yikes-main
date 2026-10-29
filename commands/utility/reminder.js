const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

function humanizeTimespan(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d) parts.push(`${d} day${d === 1 ? '' : 's'}`);
    if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
    if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
    if (s || !parts.length) parts.push(`${s} second${s === 1 ? '' : 's'}`);
    return parts.join(' and ').replace(/, and /g, ' and ');
}

async function addReminder(message, args) {
    const time = parseTime(String(args[0] || '').toLowerCase());
    if (time === null) return warn(message, 'Invalid time\n> Usage: `,reminder add 1h Close the window`');
    if (time < 60) return warn(message, "Reminder time can't be less than a minute");
    const task = args.slice(1).join(' ').trim();
    if (!task) return warn(message, 'You must provide a task\n> Usage: `,reminder add 1h Close the window`');
    try {
        const remindTime = Math.floor(Date.now() / 1000) + time;
        run('INSERT INTO reminder (user_id, channel_id, guild_id, remind_time, task) VALUES (?, ?, ?, ?, ?)',
            message.author.id, message.channel.id, message.guild.id, remindTime, task);
        return approve(message, `I'm going to remind you **in ${humanizeTimespan(time)}** about **${task}**`);
    } catch (err) {
        return warn(message, 'An error occurred while setting the reminder');
    }
}

module.exports = {
    data: { name: 'reminder', description: 'Get reminders for a duration set about whatever you choose', usage: ',reminder <add|remove|list>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',reminder add 1h Close the window',
        remove: ',reminder remove 1',
        list: ',reminder list'
    },
    execute: async (message) => sendCard(message, module.exports),

    subs: {
        add: {
            aliases: [],
            data: { name: 'reminder add', description: 'Add a reminder', usage: ',reminder add 1h Close the window' },
            execute: async (message, args) => addReminder(message, args)
        },
        remove: {
            aliases: ['cancel'],
            data: { name: 'reminder remove', description: 'Remove a reminder by its position in the list', usage: ',reminder remove 1' },
            execute: async (message, args) => {
                const id = Number(String(args[0] || '').replace(/[^\d]/g, ''));
                const results = query('SELECT * FROM reminder WHERE user_id = ? ORDER BY remind_time ASC', message.author.id);
                if (!results.length) return warn(message, 'There are **no** reminders set');
                if (!id || id < 1 || id > results.length) return warn(message, `Reminder ID \`${args[0]}\` is **invalid**`);
                const reminder = results[id - 1];
                run('DELETE FROM reminder WHERE guild_id = ? AND user_id = ? AND channel_id = ? AND remind_time = ?',
                    message.guild.id, message.author.id, reminder.channel_id, reminder.remind_time);
                return approve(message, `Deleted reminder \`${id}\` - **${reminder.task}**`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'reminder list', description: 'View a list of every reminder', usage: ',reminder list' },
            execute: async (message) => {
                const results = query('SELECT * FROM reminder WHERE user_id = ? ORDER BY remind_time ASC', message.author.id);
                if (!results.length) return warn(message, 'There are **no** reminders set');
                const entries = results.map((result) => `${result.task} - <t:${Math.floor(result.remind_time)}:R>`);
                return paginate(message, entries, 'Reminders', {
                    name: message.author.username,
                    icon_url: message.author.avatarURL()
                });
            }
        }
    }
};
