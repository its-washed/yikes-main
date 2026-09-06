const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'base64',
        description: 'Encode/decode base64',
        usage: ',base64 [encode/decode] [text]'
    },
    aliases: ['b64'],
    cooldown: 3,

    async execute(message, args) {
        const mode = args[0];
        const text = args.slice(1).join(' ');

        if (!mode || !text) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,base64 [encode/decode] [text]')] });

        try {
            if (mode === 'encode') {
                const result = Buffer.from(text).toString('base64');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Base64 Encoded', description: `\`${result}\`` })] });
            } else if (mode === 'decode') {
                const result = Buffer.from(text, 'base64').toString('utf8');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Base64 Decoded', description: result })] });
            }
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Invalid input for that mode.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Mode', 'Use `encode` or `decode`.')] });
    }
};
