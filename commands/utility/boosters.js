const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'boosters', description: 'Show all boosters', usage: ',boosters' },
    aliases: ['boosterlist'],
    cooldown: 10,
    async execute(message) {
        const boosters = message.guild.members.cache.filter(m => m.premiumSince);
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: `Boosters (${boosters.size})`, description: boosters.map(m => `${m.user.tag} — <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`).join('\n') || 'None' })] });
    }
};
