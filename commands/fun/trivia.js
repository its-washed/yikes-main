const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'trivia',
        description: 'Play a trivia game',
        usage: ',trivia'
    },
    aliases: ['quiz'],
    cooldown: 10,

    async execute(message) {
        const questions = [
            { q: 'What planet is known as the Red Planet?', a: 'Mars', o: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
            { q: 'How many continents are there?', a: '7', o: ['5', '6', '7', '8'] },
            { q: 'What is the largest ocean?', a: 'Pacific', o: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
            { q: 'What year did WW2 end?', a: '1945', o: ['1943', '1944', '1945', '1946'] },
            { q: 'What gas do plants absorb?', a: 'CO2', o: ['O2', 'CO2', 'N2', 'H2'] },
            { q: 'How many bones are in the human body?', a: '206', o: ['196', '206', '216', '256'] },
            { q: 'What is the speed of light?', a: '299,792 km/s', o: ['150,000 km/s', '299,792 km/s', '400,000 km/s', '1,000,000 km/s'] },
            { q: 'What element has the symbol O?', a: 'Oxygen', o: ['Gold', 'Osmium', 'Oxygen', 'Oganesson'] },
            { q: 'Who painted the Mona Lisa?', a: 'Da Vinci', o: ['Picasso', 'Da Vinci', 'Monet', 'Rembrandt'] },
            { q: 'What is the capital of Japan?', a: 'Tokyo', o: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'] }
        ];

        const question = questions[Math.floor(Math.random() * questions.length)];
        const options = question.o.sort(() => Math.random() - 0.5);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        const embed = createEmbed({
            color: 0x6c5ce7,
            title: 'Trivia Time!',
            description: `**${question.q}**\n\n${options.map((o, i) => `${emojis[i]} ${o}`).join('\n')}`
        });

        const msg = await message.reply({ embeds: [embed] });
        for (let i = 0; i < options.length; i++) await msg.react(emojis[i]);

        const filter = (reaction, user) => user.id === message.author.id;
        const collector = msg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            const idx = emojis.indexOf(reaction.emoji.name);
            const chosen = options[idx];
            const correct = chosen === question.a;

            await msg.edit({
                embeds: [createEmbed({
                    color: correct ? 0x00d26a : 0xff4757,
                    title: correct ? 'Correct!' : 'Wrong!',
                    description: `**${question.q}**\n\nAnswer: **${question.a}**\nYour answer: **${chosen}**`
                })]
            });
            await msg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                msg.edit({ embeds: [createEmbed({ color: 0xffa502, title: 'Time\'s Up!', description: `The answer was **${question.a}**.` })] });
                msg.reactions.removeAll();
            }
        });
    }
};
