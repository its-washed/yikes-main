const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'largeemojis', description: 'Send emojis full size', usage: ',largeemojis [emoji]' },
    aliases: ['bigemoji', 'jumbo'],
    cooldown: 3,
    async execute(message, args) {
        if (!args.length) return message.reply({ embeds: [errorEmbed('Missing Emoji', 'Usage: ,largeemojis [emoji]')] });
        const emojiRegex = /<(a?):(\w+):(\d+)>/g;
        const emojis = [];
        let match;
        while ((match = emojiRegex.exec(args.join(' '))) !== null) {
            const ext = match[1] === 'a' ? 'gif' : 'png';
            emojis.push(`https://cdn.discordapp.com/emojis/${match[3]}.${ext}?size=128`);
        }
        if (!emojis.length) return message.reply({ embeds: [errorEmbed('No Emojis', 'Provide custom Discord emojis.')] });
        return message.reply({ content: emojis.join('\n') });
    }
};
