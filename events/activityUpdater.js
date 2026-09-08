const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { buildMessageLeaderboard, buildVCLeaderboard } = require('../commands/server/setupactivity');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        setInterval(async () => {
            for (const [, guild] of client.guilds.cache) {
                const config = getGuildConfig(guild.id);
                if (!config.activityChannels) continue;

                const { messageId, messageEmbedId, vcId, vcEmbedId } = config.activityChannels;

                if (messageId && messageEmbedId) {
                    const channel = guild.channels.cache.get(messageId);
                    if (channel) {
                        const msg = await channel.messages.fetch(messageEmbedId).catch(() => null);
                        if (msg) {
                            await msg.edit({ embeds: [buildMessageLeaderboard(guild)] }).catch(() => {});
                        }
                    }
                }

                if (vcId && vcEmbedId) {
                    const channel = guild.channels.cache.get(vcId);
                    if (channel) {
                        const msg = await channel.messages.fetch(vcEmbedId).catch(() => null);
                        if (msg) {
                            await msg.edit({ embeds: [buildVCLeaderboard(guild)] }).catch(() => {});
                        }
                    }
                }
            }
        }, 3600000);
    }
};
