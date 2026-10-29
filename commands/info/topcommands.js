const { query } = require('../../utils/database');
const { paginate, parseTime, warn } = require('../../utils/context');

function stamp(seconds) {
    const date = new Date(seconds * 1000);
    const pad = value => String(value).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = {
    data: { name: 'topcommands', description: 'View the top 50 most used commands', usage: ',topcommands [time]' },
    aliases: ['topcmds'],
    cooldown: 5,

    async execute(message, args, client) {
        let seconds = null;
        if (args[0]) {
            seconds = parseTime(args[0]);
            if (seconds === null) {
                return warn(message, `**${args[0]}** is an invalid timespan`);
            }
        }

        let rows;
        let since = null;
        if (seconds) {
            since = Date.now() / 1000 - seconds;
            rows = query('SELECT command, COUNT(command) AS usage_count FROM command_history WHERE timestamp >= ? GROUP BY command ORDER BY usage_count DESC LIMIT 50', since);
        } else {
            rows = query('SELECT command, COUNT(command) AS usage_count FROM command_history GROUP BY command ORDER BY usage_count DESC LIMIT 50');
        }

        if (!rows.length) {
            return warn(message, 'No usage found');
        }

        const lines = rows.map(row => `**${row.command}** used \`${Number(row.usage_count).toLocaleString('en-US')}\` times`);
        const title = `Top commands ${since ? `since ${stamp(since)}` : 'overall'}`;

        return paginate(message, lines, title, {
            name: message.author.username,
            icon_url: message.author.displayAvatarURL({ size: 256 })
        });
    }
};
