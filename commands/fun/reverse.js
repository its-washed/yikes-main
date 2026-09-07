const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'reverse', description: 'Reverse text', usage: ',reverse <text>' },
    aliases: ['rev'],
    cooldown: 2,
    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Usage', ',reverse <text>')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reversed', description: `\`${text.split('').reverse().join('')}\`` })] });
    }
};
