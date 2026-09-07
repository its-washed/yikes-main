const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roast', description: 'Roast someone', usage: ',roast [@user]' },
    cooldown: 3,
    async execute(message) {
        const roasts = [
            'I\'d agree with you, but then we\'d both be wrong.',
            'You bring everyone a lot of joy... when you leave.',
            'You\'re like a cloud. When you disappear, it\'s a beautiful day.',
            'I\'m jealous of people who don\'t know you.',
            'You have the right to remain silent, and I wish you\'d exercise it.',
            'You\'re the reason God created the middle finger.',
            'If you were any more inbred, you\'d be a sandwich.',
            'You\'re as useful as a screen door on a submarine.',
            'Your face could be used as a Halloween mask.',
            'I\'d explain it to you, but I left my English-to-Dumb dictionary at home.'
        ];
        const target = message.mentions.users.first() || message.author;
        const roast = roasts[Math.floor(Math.random() * roasts.length)];
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Roast', description: `**${target.username}**: ${roast}` })] });
    }
};
