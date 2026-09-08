const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'freezuser', description: 'Freeze a user (Developer only)', usage: ',freezuser <@user|userId> [reason]' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!target) return message.reply({ embeds: [errorEmbed('No User', 'Mention a user to freeze.')] });

        const reason = args.slice(1).join(' ') || 'No reason';

        try {
            await target.timeout(7 * 24 * 60 * 60 * 1000, `Frozen by ${message.author.tag}: ${reason}`);
            return message.reply({ embeds: [successEmbed('Frozen', `**${target.user.tag}** has been frozen for 7 days.\nReason: ${reason}`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
