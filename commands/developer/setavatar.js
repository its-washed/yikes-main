const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'setavatar', description: 'Set bot avatar (Developer only)', usage: ',setavatar <url>' },
    aliases: ['avatar'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const url = args[0] || message.attachments.first()?.url;
        if (!url) return message.reply({ embeds: [errorEmbed('Missing URL', 'Provide an image URL or attach an image.')] });

        try {
            await client.user.setAvatar(url);
            return message.reply({ embeds: [successEmbed('Avatar Updated', 'Bot avatar changed.')] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
