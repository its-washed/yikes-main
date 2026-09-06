const { createEmbed } = require('../../utils/embeds');

const facts = [
    'Octopuses have three hearts.',
    'A group of flamingos is called a flamboyance.',
    'Honey never spoils.',
    'Bananas are berries, but strawberries aren\'t.',
    'The Eiffel Tower can be 15 cm taller during summer.',
    'A day on Venus is longer than a year on Venus.',
    'Wombat poop is cube-shaped.',
    'There are more trees on Earth than stars in the Milky Way.',
    'Otters hold hands when they sleep.',
    'A jiffy is an actual unit of time: 1/100th of a second.',
    'The inventor of the Pringles can is buried in one.',
    'Cows have best friends.',
    'The shortest war in history lasted 38 minutes.',
    'A cloud can weigh over a million pounds.',
    'There are more possible chess games than atoms in the universe.'
];

module.exports = {
    data: {
        name: 'fact',
        description: 'Get a random fun fact',
        usage: ',fact'
    },
    aliases: ['randomfact', 'funfact'],
    cooldown: 5,

    async execute(message) {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Fun Fact', description: fact })] });
    }
};
