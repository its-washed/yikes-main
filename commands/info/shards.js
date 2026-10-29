const { createEmbed, COLORS, PRESERVE } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const { warn } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');

const perPage = 6;

async function fetchHealth() {
    try {
        const res = await fetch('http://localhost:8000/health');
        if (!res.ok) return null;
        return (await res.json()) || null;
    } catch (err) {
        return null;
    }
}

module.exports = {
    data: { name: 'shards', description: 'Check status of each bot shard', usage: ',shards' },
    cooldown: 10,

    async execute(message, args, client) {
        const data = await fetchHealth();
        const clusters = (data && data.clusters) || {};

        let shards = [];
        if (data && Object.keys(clusters).length) {
            const totalUsers = Number(data.users || 0);
            const totalGuilds = Number(data.guilds || 0);
            const current = (message.guild && message.guild.shardId) || 0;
            for (const clusterInfo of Object.values(clusters)) {
                for (const shard of (clusterInfo.shards || [])) {
                    shards.push({
                        id: shard.id,
                        ping: Math.round((shard.latency || 0) * 1000),
                        guilds: shard.guilds || 0,
                        users: shard.users || 0,
                        isCurrent: shard.id === current,
                        uptime: shard.uptime,
                        secondsSinceSeen: shard.seconds_since_seen
                    });
                }
            }
            shards.sort((a, b) => a.id - b.id);

            if (shards.length) return this.sendPages(message, shards, totalUsers, totalGuilds);
        }

        const totals = new Map();
        for (const guild of client.guilds.cache.values()) {
            const id = guild.shardId || 0;
            const entry = totals.get(id) || { guilds: 0, users: 0 };
            entry.guilds++;
            entry.users += guild.memberCount || 0;
            totals.set(id, entry);
        }

        const current = (message.guild && message.guild.shardId) || 0;
        shards = client.ws.shards
            .map(shard => {
                const entry = totals.get(shard.id) || { guilds: 0, users: 0 };
                return {
                    id: shard.id,
                    ping: Math.round(shard.ping || 0),
                    guilds: entry.guilds,
                    users: entry.users,
                    isCurrent: shard.id === current
                };
            })
            .sort((a, b) => a.id - b.id);

        if (!shards.length) {
            return warn(message, 'Could not fetch shard data from API');
        }

        const totalUsers = shards.reduce((sum, shard) => sum + shard.users, 0);
        const totalGuilds = shards.reduce((sum, shard) => sum + shard.guilds, 0);
        return this.sendPages(message, shards, totalUsers, totalGuilds);
    },

    async sendPages(message, shards, totalUsers, totalGuilds) {
        const pages = [];
        for (let i = 0; i < shards.length; i += perPage) {
            const fields = shards.slice(i, i + perPage).map(shard => ({
                name: shard.isCurrent ? `Shard ${shard.id} ${EMOJIS.LEFT || '⬅️'} You` : `Shard ${shard.id}`,
                value: `**ping**: ${shard.ping}ms\n**guilds**: ${shard.guilds}\n**users**: ${shard.users.toLocaleString('en-US')}`,
                inline: true
            }));

            pages.push({
                [PRESERVE]: true,
                color: COLORS.NEUTRAL,
                title: `Total shards (${shards.length})`,
                image: { url: 'https://storagevault.cloud/users/bender/output-onlinepngtools_(2).png' },
                description: `**Total Users**: ${totalUsers.toLocaleString('en-US')}\n**Total Guilds**: ${totalGuilds.toLocaleString('en-US')}`,
                fields
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        const components = pages.length > 1 ? [paginator.buildRow()] : [];
        const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
        if (pages.length > 1) await paginator.start(message.channel, sent);
        return sent;
    }
};
