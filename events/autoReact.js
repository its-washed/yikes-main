const { Events } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;
        const config = getGuildConfig(message.guild.id);

        const triggers = config.autoReactTriggers || [];
        const msgLower = message.content.toLowerCase();
        for (const trigger of triggers) {
            if (msgLower.includes(trigger.trigger.toLowerCase())) {
                for (const emoji of trigger.emojis) {
                    await message.react(emoji).catch(() => {});
                }
            }
        }

        const channelReacts = config.autoReactChannels || {};
        if (channelReacts[message.channel.id]) {
            for (const emoji of channelReacts[message.channel.id]) {
                await message.react(emoji).catch(() => {});
            }
        }
    }
};
