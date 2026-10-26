const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, PRESERVE } = require('../../utils/embeds');
const { getStats } = require('../../utils/botStats');

const SUPPORT_URL = 'https://discord.com/users/1232207235493400600';
const GITHUB_URL = 'https://github.com/its-washed/yikes';

function uptimeText(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${days}d ${hours}h ${mins}m`;
}

const n = value => Number(value).toLocaleString('en-US');

module.exports = {
    data: { name: 'botinfo', description: 'Bot info', usage: ',botinfo' },
    aliases: ['bi'],
    cooldown: 5,
    async execute(message, args, client) {
        const stats = await getStats(client);

        let botRatio = 0.1;
        if (stats.cached >= 25) botRatio = Math.min(0.35, Math.max(0.03, stats.bots / stats.cached));
        const bots = Math.round(stats.members * botRatio);
        const humans = stats.members - bots;
        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const embed = createEmbed({
            color: 0x6c5ce7,
            timestamp: false,
            author: {
                name: client.user.username,
                iconURL: client.user.displayAvatarURL({ size: 256 })
            },
            description: [
                'Premium multi-purpose discord bot made by **[its_washed](https://itswashed.lol)**',
                `Used by **${n(stats.members)}** members in **${n(stats.guilds)}** servers on **${n(stats.shards)}** shards`
            ].join('\n'),
            fields: [
                {
                    name: 'Members',
                    value: `**Total:** ${n(stats.members)}\n**Human:** ${n(humans)}\n**Bots:** ${n(bots)}`,
                    inline: true
                },
                {
                    name: 'Channels',
                    value: `**Text:** ${n(stats.text)}\n**Voice:** ${n(stats.voice)}\n**Categories:** ${n(stats.categories)}`,
                    inline: true
                },
                {
                    name: 'System',
                    value: `**Commands:** ${n(client.commands.size)}\n**Ping:** ${client.ws.ping}ms\n**Uptime:** ${uptimeText(client.uptime)}`,
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
