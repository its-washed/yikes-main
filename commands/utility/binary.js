const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'binary',
        description: 'Convert text to/from binary',
        usage: ',binary [encode|decode] [text]'
    },
    aliases: ['bin'],
    cooldown: 3,

    async execute(message, args) {
        const action = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');

        if (!action || !text) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,binary [encode|decode] [text]')] });
        }

        try {
            if (action === 'encode' || action === 'e') {
                const binary = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Binary Encoded', description: `\`${binary}\`` })] });
            }
            if (action === 'decode' || action === 'd') {
                const decoded = text.replace(/\s/g, '').match(/.{1,8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Binary Decoded', description: decoded })] });
            }
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `encode` or `decode`.')] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Invalid binary string.')] });
        }
    }
};
