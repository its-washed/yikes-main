const { createEmbed, errorEmbed } = require('../../utils/embeds');
const crypto = require('crypto');

module.exports = {
    data: {
        name: 'hash',
        description: 'Hash text with md5, sha1, or sha256',
        usage: ',hash [algorithm] [text]'
    },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const algo = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');

        if (!algo || !text) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,hash [md5|sha1|sha256] [text]')] });
        }

        const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
        if (!algorithms.includes(algo)) {
            return message.reply({ embeds: [errorEmbed('Invalid Algorithm', `Valid: ${algorithms.join(', ')}`)] });
        }

        const hash = crypto.createHash(algo).update(text).digest('hex');

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `${algo.toUpperCase()} Hash`,
                fields: [
                    { name: 'Input', value: text.length > 100 ? text.slice(0, 100) + '...' : text, inline: false },
                    { name: 'Hash', value: `\`${hash}\``, inline: false }
                ]
            })]
        });
    }
};
