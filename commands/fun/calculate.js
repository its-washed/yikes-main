const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'calculate', description: 'Calculate a math expression', usage: ',calculate <expression>' },
    aliases: ['calc', 'math'],
    cooldown: 3,
    async execute(message, args) {
        const expr = args.join(' ');
        if (!expr) return message.reply({ embeds: [errorEmbed('Usage', ',calculate <expression>\nExample: ,calc 2+2*3')] });

        try {
            const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '');
            if (!sanitized) return message.reply({ embeds: [errorEmbed('Invalid', 'Only numbers and operators allowed.')] });
            const result = Function(`"use strict"; return (${sanitized})`)();
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Calculator', fields: [{ name: 'Expression', value: `\`${expr}\``, inline: false }, { name: 'Result', value: `\`${result}\``, inline: false }] })] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Invalid expression.')] });
        }
    }
};
