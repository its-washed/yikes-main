const { ActionRowBuilder, ButtonBuilder, ButtonStyle, version: djsVersion } = require('discord.js');
const { createEmbed, COLORS, PRESERVE } = require('../../utils/embeds');
const { getStats } = require('../../utils/botStats');

const SUPPORT_URL = 'https://discord.com/users/1232207235493400600';
const GITHUB_URL = 'https://discord.gg/ukjvTacC5';

const n = value => Number(value).toLocaleString('en-US');

async function fetchHealth() {
    try {
        const res = await fetch('http://localhost:8000/health');
        if (!res.ok) return {};
        return (await res.json()) || {};
    } catch (err) {
        return {};
    }
}

module.exports = {
    data: { name: 'botinfo', description: 'Displays information about the bot', usage: ',botinfo' },
    aliases: ['bi', 'bot', 'about'],
    cooldown: 5,

    async execute(message, args, client) {
        const data = await fetchHealth();
        const stats = await getStats(client);

        const clusters = data.clusters || {};
        const users = Number(data.users || 0) || stats.members;
        const guildsCount = Object.values(clusters).reduce((sum, cluster) => sum + Number((cluster || {}).guilds || 0), 0)
            || Number(data.guilds || 0)
            || client.guilds.cache.size;
        const shardCount = client.shard && client.shard.count ? client.shard.count : 1;

        const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            timestamp: false,
            author: {
                name: client.user.username,
                icon_url: client.user.displayAvatarURL({ size: 256 })
            },
            description: [
                'Premium multi-purpose discord bot made by [**its_washed**](https://itswashed.lol)\n',
                `Used by **${n(users)}** members in **${n(guildsCount)}** servers on **${n(shardCount)}** shards`
            ].join(''),
            fields: [
                {
                    name: 'Members',
                    value: `> **Total:** ${n(users)}\n> **Human:** ts pmo\n> **Bots:** ts pmo`,
                    inline: true
                },
                {
                    name: 'Channels',
                    value: `> **Text:** ${n(stats.text)}\n> **Voice:** ${n(stats.voice)}\n> **Categories:** ${n(stats.categories)}`,
                    inline: true
                },
                {
                    name: 'System',
                    value: `> **Commands:** ${n(client.commands.size)}\n> **discord.js:** [${djsVersion}](https://discord.js.org)\n> **Node.js:** [${process.version}](https://nodejs.org)`,
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
