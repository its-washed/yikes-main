const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'binary',
        description: 'Convert text to/from binary',
        usage: ',binary [encode/decode] [text]'
    },
    aliases: ['bin'],
    cooldown: 3,

    async execute(message, args) {
        const mode = args[0];
        const text = args.slice(1).join(' ');

        if (!mode || !text) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,binary [encode/decode] [text]')] });

        if (mode === 'encode') {
            const result = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Binary', description: `\`${result}\`` })] });
        } else if (mode === 'decode') {
            try {
                const result = text.replace(/\s/g, '').match(/.{1,8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Decoded', description: result })] });
            } catch {
                return message.reply({ embeds: [errorEmbed('Error', 'Invalid binary input.')] });
            }
        }

        return message.reply({ embeds: [errorEmbed('Invalid Mode', 'Use `encode` or `decode`.')] });
    }
};
