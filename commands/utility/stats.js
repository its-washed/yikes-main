const { ActionRowBuilder, ButtonBuilder, ButtonStyle, version: discordjsVersion } = require('discord.js');
const { createEmbed, PRESERVE } = require('../../utils/embeds');
const { getStats } = require('../../utils/botStats');

const SUPPORT_URL = 'https://discord.gg/yikes';
const GITHUB_URL = 'https://github.com/its-washed/yikes';

function uptimeText(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${days}d ${hours}h ${mins}m`;
}

const n = value => Number(value).toLocaleString('en-US');

module.exports = {
    data: { name: 'stats', description: 'Bot stats', usage: ',stats' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        const stats = await getStats(client);
        const memory = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`;
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const embed = createEmbed({
            color: 0x6c5ce7,
            timestamp: false,
            author: {
                name: client.user.username,
                iconURL: client.user.displayAvatarURL({ size: 256 })
            },
            description: [
                `Live runtime and performance stats for **[${client.user.username}](https://itswashed.lol)**`,
                `Used by **${n(stats.members)}** members in **${n(stats.guilds)}** servers on **${n(stats.shards)}** shards`
            ].join('\n'),
            fields: [
                {
                    name: 'Network',
                    value: `**Servers:** ${n(stats.guilds)}\n**Shards:** ${n(stats.shards)}\n**Channels:** ${n(stats.channels)}`,
                    inline: true
                },
                {
                    name: 'Runtime',
                    value: `**Node.js:** ${process.version}\n**discord.js:** ${discordjsVersion}\n**Memory:** ${memory}`,
                    inline: true
                },
                {
                    name: 'Performance',
                    value: `**Ping:** ${client.ws.ping}ms\n**Uptime:** ${uptimeText(client.uptime)}\n**Commands:** ${n(client.commands.size)}`,
                    inline: true
                }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(invite),
            new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(SUPPORT_URL),
            new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL(GITHUB_URL)
        );

        return message.reply({ embeds: [embed], components: [row], [PRESERVE]: true });
    }
};
