const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'serverinfodev', description: 'Get detailed info about a server (Developer only)', usage: ',serverinfodev [guildId]' },
    aliases: ['sidev'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const guildId = args[0] || message.guild.id;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return message.reply({ embeds: [errorEmbed('Not Found', 'Bot is not in that server.')] });

        await guild.members.fetch();
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: guild.name,
                thumbnail: { url: guild.iconURL({ dynamic: true }) },
                fields: [
                    { name: 'ID', value: guild.id, inline: true },
                    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Members', value: `${guild.memberCount} (${humans} humans, ${bots} bots)`, inline: true },
                    { name: 'Online', value: `${online}`, inline: true },
                    { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                    { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`, inline: true },
                    { name: 'Verification', value: `${guild.verificationLevel}`, inline: true },
                    { name: 'Features', value: guild.features.length ? guild.features.map(f => `\`${f}\``).join(', ') : 'None' }
                ]
            })]
        });
    }
};
