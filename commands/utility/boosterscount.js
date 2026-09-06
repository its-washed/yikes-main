const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'boosterscount', description: 'Count server boosters', usage: ',boosterscount' },
    aliases: ['bc'],
    cooldown: 5,
    async execute(message) {
        const boosters = message.guild.members.cache.filter(m => m.premiumSince);
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Boosters', description: `**${boosters.size}** boosters in this server.` })] });
    }
};
