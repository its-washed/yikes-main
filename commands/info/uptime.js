const { createEmbed, COLORS } = require('../../utils/embeds');

function uptimeText(ms) {
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const parts = [];
    if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    if (seconds || !parts.length) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
    return parts.join(', ');
}

module.exports = {
    data: { name: 'uptime', description: 'Displays how long has the bot been online for', usage: ',uptime' },
    aliases: ['up'],
    cooldown: 3,

    async execute(message, args, client) {
        return message.reply({
            embeds: [createEmbed({
                color: COLORS.neutral,
                description: `🕐 ${message.author}: **${uptimeText(client.uptime)}**`
            })]
        });
    }
};
