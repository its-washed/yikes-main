const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'fliptext', description: 'Flip text upside down', usage: ',fliptext <text>' },
    aliases: ['flip', 'upsidedown'],
    cooldown: 2,
    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Usage', ',fliptext <text>')] });

        const flipped = text.split('').reverse().map(c => {
            const map = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', ' ': ' ', '.': '·', ',': ',' };
            return map[c.toLowerCase()] || c;
        }).join('');
        return message.reply({ content: `(╯°□°)╯︵ ${flipped}` });
    }
};
