const { Events, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = getGuildConfig(message.guild.id);
        const hp = config.honeypot;

        if (!hp || !hp.enabled || !hp.channel) return;
        if (message.channel.id !== hp.channel) return;

        if (hp.role && message.member.roles.cache.has(hp.role)) return;

        try {
            await message.delete().catch(() => {});

            const member = message.member;

            if (hp.logChannel) {
                const logChannel = message.guild.channels.cache.get(hp.logChannel);
                if (logChannel) {
                    const { createEmbed } = require('../utils/embeds');
                    logChannel.send({
                        embeds: [createEmbed({
                            color: 0xff4757,
                            title: 'Honeypot Triggered',
                            description: `**${member.user.tag}** typed in the honeypot channel.`,
                            fields: [
                                { name: 'User', value: `${member} (${member.id})`, inline: true },
                                { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                                { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
                            ],
                            thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) }
                        })]
                    }).catch(() => {});
                }
            }

            await member.ban({ reason: 'Honeypot trigger — typed in trap channel' });

            updateGuildConfig(message.guild.id, {
                honeypot: { ...hp, bans: (hp.bans || 0) + 1 }
            });
        } catch (error) {}
    }
};
