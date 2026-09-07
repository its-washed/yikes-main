const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'compliment', description: 'Compliment someone', usage: ',compliment [@user]' },
    cooldown: 3,
    async execute(message) {
        const compliments = [
            'You\'re someone\'s reason to smile.',
            'You\'re more fun than a ball pit full of candy.',
            'You have the best laugh in the world.',
            'You light up the room.',
            'You\'re a great listener.',
            'You make people feel special.',
            'You\'re a ray of sunshine.',
            'You have impeccable manners.',
            'You\'re a great friend.',
            'You make the world a better place.',
            'You have a great sense of humor.',
            'You\'re incredibly thoughtful.',
            'Your smile is contagious.',
            'You\'re one of a kind.',
            'You\'re really strong.'
        ];
        const target = message.mentions.users.first() || message.author;
        const compliment = compliments[Math.floor(Math.random() * compliments.length)];
        return message.reply({ embeds: [createEmbed({ color: 0xff6b81, description: `**${target.username}**, ${compliment}` })] });
    }
};
