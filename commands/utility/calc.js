const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'calc',
        description: 'Simple calculator',
        usage: ',calc [expression]'
    },
    aliases: ['calculate'],
    cooldown: 3,

    async execute(message, args) {
        const expr = args.join(' ');
        if (!expr) return message.reply({ embeds: [errorEmbed('Missing Expression', 'Usage: ,calc [expression]\nExample: ,calc 2+2*3')] });

        try {
            const result = Function('"use strict"; return (' + expr.replace(/[^-()\d/*+.]/g, '') + ')')();
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Calculator', description: `\`${expr}\` = **${result}**` })] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Invalid Expression', 'Could not calculate that.')] });
        }
    }
};
