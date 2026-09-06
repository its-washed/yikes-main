const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const { addXP } = require('../utils/levels');

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = getGuildConfig(message.guild.id);
        if (!config.levels?.enabled) return;

        const xpAmount = config.levels.xpPerMessage || 15;
        const { leveledUp, data } = addXP(message.guild.id, message.author.id, xpAmount);

        if (leveledUp) {
            const channel = config.levels.levelUpChannel
                ? message.guild.channels.cache.get(config.levels.levelUpChannel)
                : message.channel;

            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(0x6c5ce7)
                    .setTitle('Level Up!')
                    .setDescription(`${message.author}, you reached **level ${data.level}**! 🎉`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};
