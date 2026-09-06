const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'percentage', description: 'Calculate percentage', usage: ',percentage [value] [total]' },
    aliases: ['percent', 'pct'],
    cooldown: 3,
    async execute(message, args) {
        if (args.length < 2) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,percentage [value] [total]')] });
        const value = parseFloat(args[0]);
        const total = parseFloat(args[1]);
        if (isNaN(value) || isNaN(total) || total === 0) return message.reply({ embeds: [errorEmbed('Invalid Numbers', 'Provide valid numbers.')] });
        const pct = ((value / total) * 100).toFixed(2);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Percentage', description: `${value} / ${total} = **${pct}%**\n\n\`${bar}\`` })] });
    }
};
