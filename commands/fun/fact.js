const { createEmbed, errorEmbed } = require('../../utils/embeds');

const facts = [
    'Honey never spoils.', 'Octopuses have three hearts.', 'Bananas are berries but strawberries aren\'t.',
    'A day on Venus is longer than a year on Venus.', 'Wombat poop is cube-shaped.',
    'Cows have best friends.', 'The Eiffel Tower can grow 6 inches in summer.',
    'Humans share 60% of their DNA with bananas.', 'A group of flamingos is called a flamboyance.',
    'The inventor of the Pringles can is buried in one.', 'Butterflies taste with their feet.',
    'There are more trees on Earth than stars in the Milky Way.', 'A jiffy is 1/100th of a second.',
    'Hot water freezes faster than cold water.', 'Venus is the only planet that spins clockwise.',
    'The shortest war lasted 38 minutes.', 'A cloud can weigh over a million pounds.',
    'Bananas are radioactive.', 'Your brain uses 20% of your body\'s energy.',
    'The moon has moonquakes.'
];

module.exports = {
    data: { name: 'fact', description: 'Random fun fact', usage: ',fact' },
    aliases: ['randomfact'],
    cooldown: 3,
    async execute(message) {
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Fun Fact', description: fact })] });
    }
};
