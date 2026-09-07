const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'unfreeze', description: 'Unfreeze a user (Developer only)', usage: ',unfreeze <@user|userId>' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [errorEmbed('No User', 'Mention a user to unfreeze.')] });

        try {
            await target.timeout(null, `Unfrozen by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Unfrozen', `**${target.user.tag}** has been unfrozen.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
