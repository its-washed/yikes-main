require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const { ShardingManager } = require('discord.js');
const { logger } = require('./utils/logger');

if (!process.env.DISCORD_TOKEN) {
    logger.error('No DISCORD_TOKEN found in .env');
    process.exit(1);
}

const totalShards = process.env.TOTAL_SHARDS || 'auto';

const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
    token: process.env.DISCORD_TOKEN,
    totalShards,
    mode: 'process',
    respawn: true,
    silent: false
});

manager.on('shardCreate', shard => logger.info(`Shard ${shard.id} spawned`));

manager.spawn({ delay: 5500, timeout: 60000 })
    .then(shards => logger.info(`Cluster manager up - ${shards.size} shard(s) online`))
    .catch(err => {
        logger.error(`Shard spawn failed: ${err.message}`);
        process.exit(1);
    });

function shutdown() {
    for (const shard of manager.shards.values()) {
        try { shard.kill(); } catch {}
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
