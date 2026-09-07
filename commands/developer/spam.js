const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'spam', description: 'Spam a message (Developer only)', usage: ',spam <count> <message>' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const count = parseInt(args[0]);
        const text = args.slice(1).join(' ');
        if (!count || !text) return message.reply({ embeds: [errorEmbed('Usage', ',spam <count> <message>')] });
        if (count > 25) return message.reply({ embeds: [errorEmbed('Limit', 'Max 25 messages.')] });

        for (let i = 0; i < count; i++) {
            await message.channel.send({ content: text }).catch(() => {});
        }
        return message.reply({ embeds: [successEmbed('Spammed', `Sent **${count}** messages.`)] });
    }
};
