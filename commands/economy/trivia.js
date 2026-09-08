const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { updateWallet } = require('../../utils/economy');

const questions = [
    { q: 'What planet is known as the Red Planet?', a: ['mars'], reward: 50 },
    { q: 'How many continents are there?', a: ['7', 'seven'], reward: 75 },
    { q: 'What is the largest ocean?', a: ['pacific', 'pacific ocean'], reward: 100 },
    { q: 'What gas do plants absorb?', a: ['carbon dioxide', 'co2'], reward: 60 },
    { q: 'How many sides does a hexagon have?', a: ['6', 'six'], reward: 40 },
    { q: 'What is the chemical symbol for gold?', a: ['au'], reward: 120 },
    { q: 'Which planet has the most moons?', a: ['saturn', 'jupiter'], reward: 150 },
    { q: 'What is the hardest natural substance?', a: ['diamond', 'diamonds'], reward: 80 },
    { q: 'How many bones are in the human body?', a: ['206'], reward: 200 },
    { q: 'What is the speed of light in km/s?', a: ['299792', '300000', '299792458'], reward: 250 },
    { q: 'What element does "O" represent?', a: ['oxygen'], reward: 50 },
    { q: 'What is the largest planet?', a: ['jupiter'], reward: 75 },
    { q: 'How many days in a leap year?', a: ['366'], reward: 60 },
    { q: 'What is the freezing point of water in Celsius?', a: ['0', '0 degrees', 'zero'], reward: 40 },
    { q: 'What country has the most people?', a: ['china', 'india'], reward: 100 },
    { q: 'What is the capital of Japan?', a: ['tokyo'], reward: 80 },
    { q: 'How many vowels are in the alphabet?', a: ['5', 'five'], reward: 30 },
    { q: 'What is the square root of 144?', a: ['12'], reward: 90 },
    { q: 'Which ocean is the deepest?', a: ['pacific', 'pacific ocean', 'mariana'], reward: 130 },
    { q: 'What year did World War II end?', a: ['1945'], reward: 180 },
];

module.exports = {
    data: { name: 'trivia', description: 'Answer trivia for money', usage: ',trivia' },
    aliases: [],
    cooldown: 30,
    async execute(message) {
        const question = questions[Math.floor(Math.random() * questions.length)];

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Trivia',
                description: `**${question.q}**\n\nReward: **$${question.reward}**\n\nType your answer in chat! You have 30 seconds.`
            })]
        });

        const filter = m => m.author.id === message.author.id;
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const answer = collected.first().content.toLowerCase().trim();

            if (question.a.includes(answer)) {
                updateWallet(message.author.id, question.reward);
                return message.reply({
                    embeds: [createEmbed({
                        color: 0x22c55e,
                        title: 'Correct!',
                        description: `The answer was **${question.a[0].toUpperCase()}**.\n\nYou earned **$${question.reward.toLocaleString()}**!`
                    })]
                });
            } else {
                return message.reply({
                    embeds: [createEmbed({
                        color: 0xff4757,
                        title: 'Wrong!',
                        description: `The answer was **${question.a[0].toUpperCase()}**.`
                    })]
                });
            }
        } catch {
            return message.reply({
                embeds: [createEmbed({
                    color: 0xffa502,
                    title: 'Time\'s Up!',
                    description: `The answer was **${question.a[0].toUpperCase()}**.`
                })]
            });
        }
    }
};
