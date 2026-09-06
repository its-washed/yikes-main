const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'hangman', description: 'Play hangman', usage: ',hangman' },
    aliases: ['hm'],
    cooldown: 30,
    async execute(message) {
        const words = ['javascript', 'discord', 'hangman', 'python', 'computer', 'keyboard', 'monitor', 'mouse', 'program', 'function', 'variable', 'command', 'server', 'channel', 'message'];
        const word = words[Math.floor(Math.random() * words.length)];
        const guessed = new Set();
        let wrong = 0;
        const maxWrong = 6;

        const render = () => {
            const display = word.split('').map(c => guessed.has(c) ? c : '_').join(' ');
            const man = ['💀', '🦴', '🦶', '🖐️', '👕', '😰'].slice(maxWrong - wrong).join('');
            return `**Word:** ${display}\n**Guessed:** ${[...guessed].join(', ') || 'None'}\n**Wrong:** ${wrong}/${maxWrong}`;
        };

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Hangman', description: render() + '\n\nType a letter to guess!' })] });

        const filter = m => m.author.id === message.author.id && m.content.length === 1 && /[a-z]/i.test(m.content);
        const collector = message.channel.createMessageCollector({ filter, time: 120000 });

        collector.on('collect', async (m) => {
            const letter = m.content.toLowerCase();
            if (guessed.has(letter)) return;
            guessed.add(letter);

            if (word.includes(letter)) {
                if (word.split('').every(c => guessed.has(c))) {
                    await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'You Won!', description: `The word was **${word}**!\n\n${render()}` })] });
                    collector.stop();
                    return;
                }
            } else {
                wrong++;
                if (wrong >= maxWrong) {
                    await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Game Over!', description: `The word was **${word}**.` })] });
                    collector.stop();
                    return;
                }
            }

            await msg.edit({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Hangman', description: render() })] });
            await m.delete().catch(() => {});
        });
    }
};
