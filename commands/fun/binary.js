const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'binary', description: 'Convert to/from binary', usage: ',binary <text|number>' },
    cooldown: 2,
    async execute(message, args) {
        const input = args.join(' ');
        if (!input) return message.reply({ embeds: [errorEmbed('Usage', ',binary <text|number>')] });

        if (/^[01\s]+$/.test(input.replace(/\s/g, ''))) {
            const text = input.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Binary to Text', description: `\`${text}\`` })] });
        }

        const binary = input.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Text to Binary', description: `\`${binary}\`` })] });
    }
};
