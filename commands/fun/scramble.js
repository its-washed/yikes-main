const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'scramble', description: 'Guess the scrambled word', usage: ',scramble' },
    aliases: ['unscramble'],
    cooldown: 15,
    async execute(message) {
        const words = ['apple', 'brain', 'crane', 'dream', 'eagle', 'flame', 'grape', 'house', 'input', 'joker', 'knife', 'lemon', 'mango', 'night', 'ocean', 'paint', 'queen', 'robin', 'snake', 'tiger', 'beach', 'cloud', 'dance', 'earth', 'faith', 'giant', 'happy', 'inner', 'juice', 'karma'];
        const word = words[Math.floor(Math.random() * words.length)];
        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Word Scramble', description: `Unscramble this: **${scrambled}**\n\nType your guess!` })] });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 5 });

        collector.on('collect', async (m) => {
            if (m.content.toLowerCase() === word) {
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Correct!', description: `The word was **${word}**!` })] });
                collector.stop();
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0 || collected.last().content.toLowerCase() !== word) {
                msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Time\'s Up!', description: `The word was **${word}**.` })] });
            }
        });
    }
};
