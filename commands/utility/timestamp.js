const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ts', description: 'Convert/create timestamps', usage: ',ts <date|now>\nFormats: YYYY-MM-DD HH:MM:SS' },
    aliases: ['timestamp'],
    cooldown: 3,
    async execute(message, args) {
        const input = args.join(' ');
        if (!input) return message.reply({ embeds: [errorEmbed('Usage', ',ts <date|now>\nExample: ,ts 2025-01-01 12:00:00\n,ts now')] });

        const date = input.toLowerCase() === 'now' ? new Date() : new Date(input);
        if (isNaN(date.getTime())) return message.reply({ embeds: [errorEmbed('Invalid Date', 'Use format: YYYY-MM-DD HH:MM:SS')] });

        const ts = Math.floor(date.getTime() / 1000);
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Timestamps',
                fields: [
                    { name: 'Unix', value: `\`${ts}\``, inline: true },
                    { name: 'Full', value: `<t:${ts}:F>`, inline: true },
                    { name: 'Relative', value: `<t:${ts}:R>`, inline: true },
                    { name: 'Short', value: `<t:${ts}:d>`, inline: true },
                    { name: 'Long', value: `<t:${ts}:D>`, inline: true },
                    { name: 'Time', value: `<t:${ts}:t>`, inline: true },
                    { name: 'Long Time', value: `<t:${ts}:T>`, inline: true },
                ]
            })]
        });
    }
};
