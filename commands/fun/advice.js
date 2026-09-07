const { createEmbed } = require('../../utils/embeds');

const advice = [
    'Don\'t count your chickens before they hatch.',
    'The early bird catches the worm.',
    'A stitch in time saves nine.',
    'Actions speak louder than words.',
    'Every cloud has a silver lining.',
    'Where there\'s a will, there\'s a way.',
    'The grass isn\'t greener on the other side.',
    'Patience is a virtue.',
    'Don\'t put all your eggs in one basket.',
    'Rome wasn\'t built in a day.',
    'Beggars can\'t be choosers.',
    'A watched pot never boils.',
    'Absence makes the heart grow fonder.',
    'Knowledge is power.',
    'Better late than never.'
];

module.exports = {
    data: { name: 'advice', description: 'Get random advice', usage: ',advice' },
    cooldown: 3,
    async execute(message) {
        const tip = advice[Math.floor(Math.random() * advice.length)];
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Advice', description: tip })] });
    }
};
