const { createEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
    data: {
        name: 'serverstats',
        description: 'Show detailed server statistics',
        usage: ',serverstats'
    },
    aliases: ['ss', 'sstats'],
    cooldown: 10,

    async execute(message) {
        const guild = message.guild;
        const total = guild.memberCount;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = total - bots;
        const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const staticEmojis = guild.emojis.cache.filter(e => !e.animated).size;
        const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
        const boostLevel = guild.premiumTier;
        const boosts = guild.premiumSubscriptionCount || 0;
        const verification = ['None', 'Low', 'Medium', 'High', 'Very High'][guild.verificationLevel] || 'Unknown';

        const features = guild.features.map(f => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));

        const onlinePercent = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
        const botPercent = total > 0 ? ((bots / total) * 100).toFixed(1) : 0;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Stats — ${guild.name}`,
                thumbnail: { url: guild.iconURL({ size: 1024, dynamic: true }) },
                fields: [
                    { name: 'Members', value: `**${total}** total\n${humans} humans (${100 - botPercent}%)\n${bots} bots (${botPercent}%)`, inline: true },
                    { name: 'Online', value: `**${online}** (${onlinePercent}%)`, inline: true },
                    { name: 'Boosts', value: `Level **${boostLevel}**\n${boosts} boost(s)`, inline: true },
                    { name: 'Channels', value: `${textChannels} text\n${voiceChannels} voice\n${categories} categories`, inline: true },
                    { name: 'Roles', value: `${roles}`, inline: true },
                    { name: 'Emojis', value: `${emojis} (${staticEmojis} static, ${animatedEmojis} animated)`, inline: true },
                    { name: 'Verification', value: verification, inline: true },
                    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Features', value: features.length > 0 ? features.join(', ') : 'None', inline: false }
                ]
            })]
        });
    }
};
