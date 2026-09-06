const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = getGuildConfig(message.guild.id);

        if (config.starboard?.enabled && message.content.includes('⭐')) {
            const starCount = (message.content.match(/⭐/g) || []).length;
            if (starCount >= (config.starboard.threshold || 5)) {
                const starChannel = message.guild.channels.cache.get(config.starboard.channel);
                if (starChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xffd700)
                        .setTitle('Starred Message')
                        .setDescription(message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: `⭐ ${starCount} | #${message.channel.name}` })
                        .setTimestamp();

                    starChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }
    }
};
