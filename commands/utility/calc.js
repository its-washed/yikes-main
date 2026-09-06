const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'calc',
        description: 'Calculate a math expression',
        usage: ',calc [expression]'
    },
    aliases: ['calculate', 'math'],
    cooldown: 3,

    async execute(message, args) {
        if (!args.length) {
            return message.reply({ embeds: [errorEmbed('Missing Expression', 'Usage: ,calc [expression]\nExample: ,calc 2 + 2 * 3')] });
        }

        const expression = args.join(' ');

        if (!/^[\d\s+\-*/().%^]+$/.test(expression)) {
            return message.reply({ embeds: [errorEmbed('Invalid Expression', 'Only numbers and math operators are allowed.')] });
        }

        try {
            const sanitized = expression.replace(/\^/g, '**');
            const result = new Function(`return (${sanitized})`)();

            if (typeof result !== 'number' || !isFinite(result)) {
                return message.reply({ embeds: [errorEmbed('Invalid Result', 'The expression could not be evaluated.')] });
            }

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Calculator',
                    fields: [
                        { name: 'Expression', value: `\`${expression}\``, inline: false },
                        { name: 'Result', value: `\`${result}\``, inline: false }
                    ]
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Calculation Error', 'Invalid mathematical expression.')] });
        }
    }
};
