const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'base64',
        description: 'Encode or decode base64',
        usage: ',base64 [encode|decode] [text]'
    },
    aliases: ['b64'],
    cooldown: 3,

    async execute(message, args) {
        const action = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');

        if (!action || !text) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,base64 [encode|decode] [text]')] });
        }

        try {
            if (action === 'encode' || action === 'e') {
                const encoded = Buffer.from(text).toString('base64');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Base64 Encoded', description: `\`${encoded}\`` })] });
            }
            if (action === 'decode' || action === 'd') {
                const decoded = Buffer.from(text, 'base64').toString('utf8');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Base64 Decoded', description: decoded })] });
            }
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `encode` or `decode`.')] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Invalid base64 string.')] });
        }
    }
};
