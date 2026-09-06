const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        const config = getGuildConfig(member.guild.id);

        if (config.goodbyeChannel) {
            const channel = member.guild.channels.cache.get(config.goodbyeChannel);
            if (channel) {
                const message = (config.goodbyeMessage || 'Goodbye {user}, we will miss you!')
                    .replace(/{user}/g, member.user.tag)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor(0xff4757)
                    .setTitle('Goodbye!')
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Member #${member.guild.memberCount}` })
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};
