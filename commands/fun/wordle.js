const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'wordle', description: 'Play Wordle', usage: ',wordle' },
    aliases: [],
    cooldown: 30,
    async execute(message) {
        const words = ['apple', 'brain', 'crane', 'dream', 'eagle', 'flame', 'grape', 'house', 'input', 'joker', 'knife', 'lemon', 'mango', 'night', 'ocean', 'paint', 'queen', 'robin', 'snake', 'tiger', 'ultra', 'vivid', 'whale', 'xenon', 'young', 'zebra', 'beach', 'cloud', 'dance', 'earth'];
        const word = words[Math.floor(Math.random() * words.length)];
        let attempts = 0;
        const maxAttempts = 6;

        const renderGuess = (guess) => {
            return guess.split('').map((c, i) => {
                if (c === word[i]) return `🟩`;
                if (word.includes(c)) return `🟨`;
                return `⬛`;
            }).join('');
        };

        const msg = await message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Wordle', description: `Guess the 5-letter word! You have **${maxAttempts}** attempts.\n\nType your guess in chat.` })]
        });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 120000 });

        collector.on('collect', async (m) => {
            const guess = m.content.toLowerCase();
            if (guess.length !== 5) return;
            attempts++;

            const result = renderGuess(guess);

            if (guess === word) {
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'You Won!', description: `Got it in **${attempts}** attempts!\n\n${result}\nWord: **${word}**` })] });
                collector.stop();
                return;
            }

            if (attempts >= maxAttempts) {
                await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Game Over!', description: `The word was **${word}**.` })] });
                collector.stop();
                return;
            }

            await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Wordle', description: `Attempts: ${attempts}/${maxAttempts}\n\n${result}\n\nGuess again!` })] });
            await m.delete().catch(() => {});
        });
    }
};
