const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'insult', description: 'Insult someone randomly', usage: ',insult [@user]' },
    cooldown: 3,
    async execute(message, args) {
        const insults = [
            'You\'re as useful as a screen door on a submarine.',
            'If you were any more inbred, you\'d be a sandwich.',
            'You bring everyone a lot of joy... when you leave.',
            'You\'re the reason God created the middle finger.',
            'I\'d agree with you, but then we\'d both be wrong.',
            'You\'re like a cloud. When you disappear, it\'s a beautiful day.',
            'I\'m jealous of people who don\'t know you.',
            'You have the right to remain silent, and I wish you\'d exercise it.',
            'Your face could be used as a Halloween mask.',
            'If you were any smarter, you\'d be a crystal ball.'
        ];
        const target = message.mentions.users.first() || message.author;
        const insult = insults[Math.floor(Math.random() * insults.length)];
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: `**${target.username}**: ${insult}` })] });
    }
};
