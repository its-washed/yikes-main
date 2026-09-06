const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        const config = getGuildConfig(member.guild.id);

        if (config.autorole) {
            try {
                const role = member.guild.roles.cache.get(config.autorole);
                if (role) {
                    await member.roles.add(role, 'Auto role on join');
                }
            } catch (error) {}
        }

        if (config.welcomeChannel) {
            const channel = member.guild.channels.cache.get(config.welcomeChannel);
            if (channel) {
                const message = (config.welcomeMessage || 'Welcome to the server, {user}!')
                    .replace(/{user}/g, `${member}`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor(0x00d26a)
                    .setTitle('Welcome!')
                    .setDescription(message)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Member #${member.guild.memberCount}` })
                    .setTimestamp();

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        if (config.ghostPing?.enabled && config.ghostPing?.channel) {
            const gpChannel = member.guild.channels.cache.get(config.ghostPing.channel);
            if (gpChannel) {
                try {
                    const pingMsg = await gpChannel.send({ content: `${member}` });
                    setTimeout(() => {
                        pingMsg.delete().catch(() => {});
                    }, 3000);
                } catch {}
            }
        }
    }
};
