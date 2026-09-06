const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'booststatus', description: 'Check server boost status', usage: ',booststatus' },
    aliases: ['bst'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        const boosts = g.premiumSubscriptionCount || 0;
        const level = g.premiumTier;
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Boost Status', fields: [{ name: 'Boosts', value: `${boosts}`, inline: true }, { name: 'Level', value: `${level}`, inline: true }] })] });
    }
};
