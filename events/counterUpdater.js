const { Events } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const updateCounters = async () => {
            for (const guild of client.guilds.cache.values()) {
                const config = getGuildConfig(guild.id);
                const counters = config.counters;
                if (!counters?.enabled || !counters.channels?.length) continue;

                for (const counter of counters.channels) {
                    const channel = guild.channels.cache.get(counter.channelId);
                    if (!channel) continue;

                    try {
                        let name;
                        switch (counter.type) {
                            case 'members': name = `Members: ${guild.memberCount}`; break;
                            case 'online': name = `Online: ${guild.members.cache.filter(m => m.presence?.status !== 'offline').size}`; break;
                            case 'channels': name = `Channels: ${guild.channels.cache.size}`; break;
                            case 'roles': name = `Roles: ${guild.roles.cache.size}`; break;
                            case 'bots': name = `Bots: ${guild.members.cache.filter(m => m.user.bot).size}`; break;
                            case 'boosts': name = `Boosts: ${guild.premiumSubscriptionCount || 0}`; break;
                        }
                        if (name && channel.name !== name) {
                            await channel.setName(name).catch(() => {});
                        }
                    } catch {}
                }
            }
        };

        setInterval(updateCounters, 60000);
        setTimeout(updateCounters, 5000);
    }
};
