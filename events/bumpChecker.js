const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

const activeTimers = new Map();

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const checkBumps = async () => {
            for (const [guildId, config] of Object.entries(require('../utils/config').getGuildConfig.__proto__ ? {} : {})) {}

            for (const guild of client.guilds.cache.values()) {
                const config = getGuildConfig(guild.id);
                const br = config.bumpReminder;
                if (!br?.enabled || !br.channel || !br.lastBump) continue;

                const interval = (br.interval || 2) * 3600000;
                const elapsed = Date.now() - br.lastBump;

                if (elapsed >= interval) {
                    const channel = guild.channels.cache.get(br.channel);
                    if (channel) {
                        try {
                            const { createEmbed } = require('../utils/embeds');
                            await channel.send({
                                embeds: [createEmbed({
                                    color: 0x6c5ce7,
                                    title: 'Bump Reminder!',
                                    description: 'Time to bump your server on [Disboard](https://disboard.org/)!\n\nUse `/bump` on Disboard to get more members.',
                                    fields: [{ name: 'Command', value: '`/bump` on Disboard', inline: true }]
                                })]
                            });
                            updateGuildConfig(guild.id, {
                                bumpReminder: { ...br, lastBump: Date.now() }
                            });
                        } catch {}
                    }
                }
            }
        };

        setInterval(checkBumps, 60000);
    }
};
