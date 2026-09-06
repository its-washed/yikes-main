const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { addPremium, removePremium, isPremium, loadPremium } = require('../../utils/premium');

module.exports = {
    data: { name: 'premium', description: 'Manage premium status for users (Developer only)', usage: ',premium [add/remove] [@user]' },
    aliases: ['prem'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0];
        const target = message.mentions.users.first();

        if (!action || !target) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,premium [add/remove] [@user]')] });

        if (action === 'add') {
            if (isPremium(target.id)) return message.reply({ embeds: [errorEmbed('Already Premium', `${target.tag} is already a premium user.`)] });
            addPremium(target.id);
            return message.reply({ embeds: [successEmbed(`Added **${target.tag}** as a premium user.`)] });
        } else if (action === 'remove') {
            if (!isPremium(target.id)) return message.reply({ embeds: [errorEmbed('Not Premium', `${target.tag} is not a premium user.`)] });
            removePremium(target.id);
            return message.reply({ embeds: [successEmbed(`Removed **${target.tag}** from premium.`)] });
        } else if (action === 'list') {
            const data = loadPremium();
            if (!data.premiumUsers.length) return message.reply({ embeds: [errorEmbed('Empty', 'No premium users found.')] });
            const list = data.premiumUsers.map(id => `<@${id}>`).join(', ');
            return message.reply({ embeds: [createEmbed({ color: 0xffd700, title: 'Premium Users', description: list })] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add`, `remove`, or `list`.')] });
        }
    }
};
