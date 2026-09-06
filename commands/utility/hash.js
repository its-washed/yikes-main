const { createEmbed, errorEmbed } = require('../../utils/embeds');
const crypto = require('crypto');

module.exports = {
    data: {
        name: 'hash',
        description: 'Hash text with various algorithms',
        usage: ',hash [algorithm] [text]'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const algo = args[0];
        const text = args.slice(1).join(' ');

        if (!algo || !text) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,hash [md5/sha1/sha256] [text]')] });

        try {
            const hash = crypto.createHash(algo).update(text).digest('hex');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${algo.toUpperCase()} Hash`, description: `\`${hash}\`` })] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Invalid Algorithm', 'Supported: md5, sha1, sha256, sha512')] });
        }
    }
};
