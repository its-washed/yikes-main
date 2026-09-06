const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'timestamps', description: 'Convert timestamp to Discord format', usage: ',timestamps [date]' },
    aliases: ['ts'],
    cooldown: 3,
    async execute(message, args) {
        const input = args.join(' ');
        if (!input) return message.reply({ embeds: [errorEmbed('Missing Date', 'Usage: ,timestamps [YYYY-MM-DD HH:MM]')] });
        const date = new Date(input);
        if (isNaN(date.getTime())) return message.reply({ embeds: [errorEmbed('Invalid Date', 'Provide a valid date format.')] });
        const ts = Math.floor(date.getTime() / 1000);
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: 'Timestamps',
                description: `**Date:** ${date.toDateString()}\n\n` +
                    `Short: <t:${ts}:d>\n` +
                    `Long: <t:${ts}:D>\n` +
                    `Time: <t:${ts}:t>\n` +
                    `Full: <t:${ts}:T>\n` +
                    `Relative: <t:${ts}:R>`
            })]
        });
    }
};
