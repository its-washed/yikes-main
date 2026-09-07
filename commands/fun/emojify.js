const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'emojify', description: 'Convert text to emojis', usage: ',emojify <text>' },
    aliases: ['emoji'],
    cooldown: 3,
    async execute(message, args) {
        const text = args.join(' ').toLowerCase();
        if (!text) return message.reply({ embeds: [errorEmbed('Usage', ',emojify <text>')] });

        const map = { a: '🅰️', b: '🅱️', c: '©️', d: '🇩', e: '📧', f: '🇫', g: '🅖', h: '♓', i: 'ℹ️', j: '},
            k: '🇰', l: '🅻', m: '🅼', n: '🅽', o: '🅾️', p: '🅿️', q: '🇶', r: '🇷', s: '.S', t: '🆃',
            u: '🆄', v: '.V', w: '🆆', x: '❌', y: '🆈', z: '}'];
        const emojis = text.split('').map(c => map[c] || (c === ' ' ? '   ' : c)).join('');
        return message.reply({ content: emojis });
    }
};
