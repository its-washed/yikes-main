const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'capybara', description: 'Get a random capybara image', usage: ',capybara' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://api.evelina.bot/fun/capybara?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        if (Array.isArray(result)) result = result[0];
        if (!result || !result.data || !result.data.url) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a capybara image.')] });
        }
        const embed = createEmbed({ color: COLORS.NEUTRAL, image: { url: result.data.url } });
        return message.reply({ embeds: [embed] });
    }
};
