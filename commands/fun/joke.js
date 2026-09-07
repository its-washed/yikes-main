const { createEmbed } = require('../../utils/embeds');

const jokes = [
    'Why don\'t scientists trust atoms? Because they make up everything.',
    'I told my wife she was drawing her eyebrows too high. She looked surprised.',
    'What do you call a fake noodle? An impasta.',
    'Why did the scarecrow win an award? He was outstanding in his field.',
    'What do you call a dog that does magic tricks? A Labracadabrador.',
    'I\'m reading a book about anti-gravity. It\'s impossible to put down.',
    'Why don\'t eggs tell jokes? They\'d crack each other up.',
    'What did the ocean say to the beach? Nothing, it just waved.',
    'Why did the bicycle fall over? Because it was two-tired.',
    'What do you call cheese that isn\'t yours? Nacho cheese.',
    'Why can\'t a leopard play hide and seek? Because he\'s always spotted.',
    'What did the cow say to the farmer? Mooooove over.',
    'Why did the music teacher need a ladder? To reach the high notes.',
    'What\'s orange and sounds like a parrot? A carrot.',
    'I used to hate facial hair, but then it grew on me.'
];

module.exports = {
    data: { name: 'joke', description: 'Tell a random joke', usage: ',joke' },
    aliases: ['dadjoke'],
    cooldown: 3,
    async execute(message) {
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Joke', description: joke })] });
    }
};
