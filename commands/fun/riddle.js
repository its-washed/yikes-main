const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'riddle', description: 'Solve a riddle', usage: ',riddle' },
    aliases: [],
    cooldown: 15,
    async execute(message) {
        const riddles = [
            { q: 'What has keys but no locks?', a: 'piano' },
            { q: 'What has a head and a tail but no body?', a: 'coin' },
            { q: 'What gets wetter the more it dries?', a: 'towel' },
            { q: 'What can travel around the world while staying in a corner?', a: 'stamp' },
            { q: 'What has many teeth but cannot bite?', a: 'comb' },
            { q: 'What can you catch but not throw?', a: 'cold' },
            { q: 'What comes once in a minute, twice in a moment, but never in a thousand years?', a: 'm' },
            { q: 'What has an eye but cannot see?', a: 'needle' }
        ];

        const riddle = riddles[Math.floor(Math.random() * riddles.length)];
        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Riddle', description: `**${riddle.q}**\n\nType your answer!` })] });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 3 });

        collector.on('collect', async (m) => {
            if (m.content.toLowerCase().includes(riddle.a)) {
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Correct!', description: `The answer is **${riddle.a}**!` })] });
                collector.stop();
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0 || !collected.last().content.toLowerCase().includes(riddle.a)) {
                msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Time\'s Up!', description: `The answer was **${riddle.a}**.` })] });
            }
        });
    }
};
