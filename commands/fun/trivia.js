const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'trivia',
        description: 'Play trivia',
        usage: ',trivia'
    },
    aliases: ['quiz'],
    cooldown: 15,

    async execute(message) {
        const questions = [
            { q: 'What is the capital of Japan?', a: 'Tokyo', options: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya'] },
            { q: 'What planet is known as the Red Planet?', a: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
            { q: 'What is the largest ocean?', a: 'Pacific', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
            { q: 'Who painted the Mona Lisa?', a: 'Leonardo da Vinci', options: ['Picasso', 'Leonardo da Vinci', 'Van Gogh', 'Rembrandt'] },
            { q: 'What year did WW2 end?', a: '1945', options: ['1943', '1944', '1945', '1946'] }
        ];

        const q = questions[Math.floor(Math.random() * questions.length)];
        const shuffled = q.options.sort(() => Math.random() - 0.5);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Trivia',
                description: `**${q.q}**\n\n${shuffled.map((o, i) => `${emojis[i]} ${o}`).join('\n')}`
            })]
        });

        for (let i = 0; i < shuffled.length; i++) await msg.react(emojis[i]);

        const filter = (r, u) => u.id === message.author.id;
        const collector = msg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            const idx = emojis.indexOf(reaction.emoji.name);
            const chosen = shuffled[idx];
            const correct = chosen === q.a;

            await msg.edit({
                embeds: [createEmbed({
                    color: correct ? 0x00d26a : 0xff4757,
                    title: correct ? 'Correct!' : 'Wrong!',
                    description: `**${q.q}**\nAnswer: **${q.a}**\nYour answer: **${chosen}**`
                })]
            });
            await msg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                msg.edit({ embeds: [createEmbed({ color: 0xffa502, title: 'Time\'s Up!', description: `Answer: **${q.a}**` })] });
                msg.reactions.removeAll();
            }
        });
    }
};
