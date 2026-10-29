const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { query, first } = require('../../utils/database');
const { COLORS } = require('../../utils/styles');

function fmt(value) {
    return Number(value || 0).toLocaleString('en-US');
}

module.exports = {
    data: { name: 'cmdstats', description: 'Shows command usage statistics', usage: ',cmdstats' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        const mostUsed = query('SELECT command, COUNT(*) AS usage_count, AVG(execution_time) AS avg_time FROM command_stats GROUP BY command ORDER BY usage_count DESC LIMIT 10');
        const totalRow = first('SELECT COUNT(*) AS total FROM command_stats');
        const avgRow = first('SELECT AVG(execution_time) AS avg_time FROM command_stats');
        const mostActive = query('SELECT user_id, COUNT(*) AS usage_count FROM command_stats GROUP BY user_id ORDER BY usage_count DESC LIMIT 5');
        const mostActiveGuilds = query('SELECT guild_id, COUNT(*) AS usage_count FROM command_stats WHERE guild_id IS NOT NULL GROUP BY guild_id ORDER BY usage_count DESC LIMIT 5');

        const embed = { color: COLORS.NEUTRAL, title: 'Command Statistics', fields: [] };

        if (mostUsed.length) {
            const lines = mostUsed.map(row => `\`${row.command}\` - ${fmt(row.usage_count)} uses (avg: ${Number(row.avg_time || 0).toFixed(2)}ms)`);
            embed.fields.push({ name: 'Most Used Commands', value: lines.join('\n'), inline: false });
        }

        embed.fields.push({
            name: 'Overall Statistics',
            value: `Total Commands: \`${fmt(totalRow && totalRow.total)}\`\nAverage Execution Time: \`${Number(avgRow && avgRow.avg_time || 0).toFixed(2)}ms\``,
            inline: false
        });

        if (mostActive.length) {
            const lines = [];
            for (const row of mostActive) {
                const user = client.users.cache.get(row.user_id);
                if (user) lines.push(`<@${row.user_id}> - ${fmt(row.usage_count)} commands`);
            }
            if (lines.length) embed.fields.push({ name: 'Most Active Users', value: lines.join('\n'), inline: true });
        }

        if (mostActiveGuilds.length) {
            const lines = [];
            for (const row of mostActiveGuilds) {
                const guild = client.guilds.cache.get(row.guild_id);
                if (guild) lines.push(`${guild.name} - ${fmt(row.usage_count)} commands`);
            }
            if (lines.length) embed.fields.push({ name: 'Most Active Guilds', value: lines.join('\n'), inline: true });
        }

        return message.reply({ embeds: [embed] });
    }
};
