const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'botstats', description: 'View detailed bot statistics (Developer only)', usage: ',botstats' },
    aliases: ['stats', 'bs'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const uptime = formatUptime(client.uptime);
        const mem = process.memoryUsage();
        const gcStats = global.gc ? { used: Math.round(mem.heapUsed / 1024 / 1024), total: Math.round(mem.heapTotal / 1024 / 1024) } : null;

        const guilds = client.guilds.cache;
        const totalMembers = guilds.reduce((acc, g) => acc + g.memberCount, 0);
        const totalChannels = guilds.reduce((acc, g) => acc + g.channels.cache.size, 0);

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Bot Statistics',
                fields: [
                    { name: 'Servers', value: `${guilds.size}`, inline: true },
                    { name: 'Users', value: `${totalMembers.toLocaleString()}`, inline: true },
                    { name: 'Channels', value: `${totalChannels.toLocaleString()}`, inline: true },
                    { name: 'Commands', value: `${client.commands.size}`, inline: true },
                    { name: 'Aliases', value: `${client.aliases.size}`, inline: true },
                    { name: 'Uptime', value: uptime, inline: true },
                    { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Memory', value: `${Math.round(mem.rss / 1024 / 1024)}MB`, inline: true },
                    { name: 'Node', value: process.version, inline: true },
                    { name: 'Platform', value: `${process.platform} ${process.arch}`, inline: true },
                    { name: 'Guilds > 100', value: `${guilds.filter(g => g.memberCount > 100).size}`, inline: true },
                    { name: 'Guilds > 1k', value: `${guilds.filter(g => g.memberCount > 1000).size}`, inline: true },
                    { name: 'Guilds > 10k', value: `${guilds.filter(g => g.memberCount > 10000).size}`, inline: true }
                ]
            })]
        });
    }
};

function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
}
