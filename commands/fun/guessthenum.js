const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'guessthenum', description: 'Guess the number (1-100)', usage: ',guessthenum' },
    aliases: ['gtn', 'guessnum'],
    cooldown: 10,
    async execute(message) {
        const target = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;

        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Guess the Number', description: 'I\'m thinking of a number between **1** and **100**.\nType your guess!' })] });

        const filter = m => m.author.id === message.author.id && /^\d+$/.test(m.content);
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', async (m) => {
            const guess = parseInt(m.content);
            attempts++;

            if (guess === target) {
                await msg.edit({ embeds: [createEmbed({ color: 0x00d26a, title: 'Correct!', description: `You got it in **${attempts}** attempts!\nThe number was **${target}**.` })] });
                collector.stop();
                return;
            }

            if (attempts >= 10) {
                await msg.edit({ embeds: [createEmbed({ color: 0xff4757, title: 'Out of Attempts!', description: `The number was **${target}**.` })] });
                collector.stop();
                return;
            }

            const hint = guess < target ? 'Higher!' : 'Lower!';
            await m.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: `${hint} (${attempts}/10)` })] }).then(r => setTimeout(() => r.delete().catch(() => {}), 3000));
        });
    }
};
