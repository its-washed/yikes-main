const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'zalgo',
        description: 'Zalgo text',
        usage: ',zalgo [text]'
    },
    aliases: ['hail'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,zalgo [text]')] });

        const zalgoUp = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307', '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F', '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315', '\u031A', '\u033D', '\u033E', '\u033F', '\u0340', '\u0341', '\u0342', '\u0343', '\u0344', '\u0346', '\u034A', '\u034B', '\u034C', '\u0350', '\u0351', '\u0352', '\u0357', '\u0358', '\u035C', '\u0363'];

        const result = text.split('').map(c => {
            if (c.match(/\s/)) return c;
            let zalgo = '';
            const count = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < count; i++) {
                zalgo += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
            }
            return c + zalgo;
        }).join('');

        return message.reply({ content: result });
    }
};
