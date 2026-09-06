const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'advice',
        description: 'Get random advice',
        usage: ',advice'
    },
    aliases: ['lifeadvice'],
    cooldown: 5,

    async execute(message) {
        const advice = [
            'Never give up on something you really want.',
            'The best time to plant a tree was 20 years ago. The second best time is now.',
            'Don\'t compare your life to others. You have no idea what their journey is.',
            'Life isn\'t fair, but it\'s still good.',
            'Don\'t take yourself so seriously. No one else does.',
            'Make peace with your past so it doesn\'t ruin your present.',
            'No one is in charge of your happiness except you.',
            'Smile. You don\'t own all the problems in the world.',
            'The most important thing is to enjoy your life.',
            'You only live once, but if you do it right, once is enough.'
        ];

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Advice', description: `*"${advice[Math.floor(Math.random() * advice.length)]}"*` })] });
    }
};
