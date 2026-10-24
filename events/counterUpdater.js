const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { updateCounter } = require('../commands/server/counter');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const updateCounters = async () => {
            for (const guild of client.guilds.cache.values()) {
                const config = getGuildConfig(guild.id);
                const counters = Array.isArray(config.counters) ? config.counters : [];
                if (!counters.length) continue;

                for (const counter of counters) {
                    try {
                        await updateCounter(guild, counter);
                    } catch {}
                }
            }
        };

        setInterval(updateCounters, 60000);
        setTimeout(updateCounters, 5000);
    }
};
