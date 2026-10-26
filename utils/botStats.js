function collectStats(client) {
    const stats = { guilds: 0, members: 0, channels: 0, text: 0, voice: 0, categories: 0, cached: 0, bots: 0 };
    for (const guild of client.guilds.cache.values()) {
        stats.guilds++;
        stats.members += guild.memberCount || 0;
        for (const channel of guild.channels.cache.values()) {
            stats.channels++;
            if (channel.type === 0 || channel.type === 5 || channel.type === 15) stats.text++;
            else if (channel.type === 2) stats.voice++;
            else if (channel.type === 4) stats.categories++;
        }
        for (const member of guild.members.cache.values()) {
            stats.cached++;
            if (member.user.bot) stats.bots++;
        }
    }
    return stats;
}

function mergeStats(parts) {
    const total = { guilds: 0, members: 0, channels: 0, text: 0, voice: 0, categories: 0, cached: 0, bots: 0 };
    for (const part of parts) {
        if (!part) continue;
        for (const key of Object.keys(total)) total[key] += part[key] || 0;
    }
    return total;
}

async function getStats(client) {
    let stats;
    if (client.shard) {
        try {
            stats = mergeStats(await client.shard.broadcastEval(collectStats));
        } catch {
            stats = collectStats(client);
        }
    } else {
        stats = collectStats(client);
    }
    stats.shards = client.shard ? client.shard.count : 1;
    return stats;
}

module.exports = { getStats, collectStats };
