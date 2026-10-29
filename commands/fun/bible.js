const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'bible', description: 'Get a random bible verse', usage: ',bible' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://beta.ourmanna.com/api/v1/get?format=json&order=random');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        const verse = result && result.verse && result.verse.details;
        if (!verse) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a bible verse.')] });
        }
        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `**${verse.reference}**\n ${verse.text}`
        });
        return message.reply({ embeds: [embed] });
    }
};
