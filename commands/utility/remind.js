const { warn, approve, parseTime } = require('../../utils/context');
const { run } = require('../../utils/database');

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

module.exports = {
    data: { name: 'remind', description: "Add a reminder", usage: ',remind 1h Close the window', params: ['time', 'message'] },
    aliases: ['remindme'],
    cooldown: 5,

    async execute(message, args) {
        const time = parseTime(String(args[0] || '').toLowerCase());
        if (time === null) return warn(message, 'Invalid time\n> Usage: `,remind 1h Close the window`');
        if (time < 60) return warn(message, "Reminder time can't be less than a minute");

        const task = args.slice(1).join(' ').trim();
        if (!task) return warn(message, 'You must provide a task\n> Usage: `,remind 1h Close the window`');

        try {
            const remindTime = Math.floor(Date.now() / 1000) + time;
            run('INSERT INTO reminder (user_id, channel_id, guild_id, remind_time, task) VALUES (?, ?, ?, ?, ?)',
                message.author.id, message.channel.id, message.guild.id, remindTime, task);
            return approve(message, `I'm going to remind you **in ${humanizeTimespan(time)}** about **${task}**`);
        } catch (err) {
            return warn(message, 'An error occurred while setting the reminder');
        }
    }
};
