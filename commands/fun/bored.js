const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'bored',
        description: 'Get a random activity to do',
        usage: ',bored'
    },
    aliases: ['activity', 'somethingtodo'],
    cooldown: 5,

    async execute(message) {
        const activities = [
            'Go for a 15-minute walk outside.',
            'Learn a new word and use it in conversation.',
            'Draw something, even if you\'re bad at it.',
            'Read 10 pages of a book.',
            'Organize your desk or room.',
            'Try a new recipe.',
            'Write down 3 things you\'re grateful for.',
            'Call someone you haven\'t talked to in a while.',
            'Do 20 pushups.',
            'Watch a documentary about something you know nothing about.',
            'Rearrange your furniture.',
            'Start a journal.',
            'Learn to solve a Rubik\'s cube.',
            'Make a playlist of 10 new songs.',
            'Clean your phone\'s home screen.'
        ];

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Activity Suggestion', description: activities[Math.floor(Math.random() * activities.length)] })] });
    }
};
