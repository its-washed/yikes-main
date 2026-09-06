const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'serverinfo',
        description: 'Get server information',
        usage: ',serverinfo'
    },
    aliases: ['si', 'guild'],
    cooldown: 5,

    async execute(message) {
        const guild = message.guild;

        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        const features = guild.features.map(f => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(', ') || 'None';

        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;

        const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;

        const embed = createEmbed({
            color: 0x6c5ce7,
            title: guild.name,
            thumbnail: { url: guild.iconURL({ size: 1024, dynamic: true }) },
            fields: [
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Verification', value: verificationLevels[guild.verificationLevel] || 'Unknown', inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Online', value: `${onlineMembers}`, inline: true },
                { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
                { name: 'Channels', value: `${textChannels} text, ${voiceChannels} voice, ${categories} categories`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: 'Features', value: features.length > 1024 ? features.slice(0, 1021) + '...' : features, inline: false }
            ]
        });

        if (guild.bannerURL()) {
            embed.setImage({ url: guild.bannerURL({ size: 1024 }) });
        }

        return message.reply({ embeds: [embed] });
    }
};
