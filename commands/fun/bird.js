const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'bird', description: 'Get a random bird image', usage: ',bird' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://api.evelina.bot/fun/bird?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        if (Array.isArray(result)) result = result[0];
        if (!result || !result.file) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a bird image.')] });
        }
        const embed = createEmbed({ color: COLORS.NEUTRAL, image: { url: result.file } });
        return message.reply({ embeds: [embed] });
    }
};
