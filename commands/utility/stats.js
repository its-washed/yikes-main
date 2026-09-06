const { createEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
    data: {
        name: 'stats',
        description: 'Show bot statistics',
        usage: ',stats'
    },
    aliases: ['botstats', 'info'],
    cooldown: 10,

    async execute(message, args, client) {
        const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Bot Statistics',
                fields: [
                    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                    { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                    { name: 'Commands', value: `${client.commands.size}`, inline: true },
                    { name: 'Uptime', value: formatUptime(client.uptime), inline: true },
                    { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Memory', value: `${memUsed}MB / ${memTotal}MB`, inline: true },
                    { name: 'Node.js', value: process.version, inline: true },
                    { name: 'Platform', value: `${os.platform()} ${os.arch()}`, inline: true }
                ],
                thumbnail: { url: client.user.displayAvatarURL({ size: 1024 }) }
            })]
        });
    }
};

function formatUptime(ms) {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000) % 24;
    const d = Math.floor(ms / 86400000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}
