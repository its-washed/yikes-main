const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ascii', description: 'Convert text to ASCII art', usage: ',ascii <text>' },
    cooldown: 5,
    async execute(message, args) {
        const text = args.join(' ') || 'Hello';
        try {
            const res = await fetch(`https://ascii-api.0m.me/${encodeURIComponent(text)}`);
            const art = await res.text();
            if (art.length > 10) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'ASCII Art', description: `\`\`\`\n${art.slice(0, 1900)}\n\`\`\`` })] });
            }
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not generate ASCII art.')] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not generate ASCII art.')] });
        }
    }
};
