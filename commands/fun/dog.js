const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'dog', description: 'Get a random dog image', usage: ',dog' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://api.evelina.bot/fun/dog?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        if (Array.isArray(result)) result = result[0];
        if (!result || !result.url) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a dog image.')] });
        }
        const embed = createEmbed({ color: COLORS.NEUTRAL, image: { url: result.url } });
        return message.reply({ embeds: [embed] });
    }
};
