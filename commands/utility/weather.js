const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'weather', description: 'Get weather for a location', usage: ',weather <city>' },
    cooldown: 5,
    async execute(message, args) {
        const city = args.join(' ');
        if (!city) return message.reply({ embeds: [errorEmbed('Usage', ',weather <city>')] });

        try {
            const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
            const text = await res.text();
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Weather', description: `\`\`\`\n${text}\n\`\`\`` })] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch weather.')] });
        }
    }
};
