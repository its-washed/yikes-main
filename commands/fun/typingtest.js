const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'typingtest',
        description: 'Test your typing speed',
        usage: ',typingtest'
    },
    aliases: ['tt', 'type'],
    cooldown: 30,

    async execute(message) {
        const sentences = [
            'the quick brown fox jumps over the lazy dog',
            'pack my box with five dozen liquor jugs',
            'how vexingly quick daft zebras jump',
            'the five boxing wizards jump quickly',
            'sphinx of black quartz judge my vow',
            'two driven jocks help fax my big quiz',
            'the quick brown dog jumps over the lazy fox'
        ];

        const sentence = sentences[Math.floor(Math.random() * sentences.length)];
        const startTime = Date.now();

        await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Typing Test',
                description: `Type this as fast as you can:\n\n**${sentence}**\n\nYou have 60 seconds. Reply with the sentence when ready.`
            })]
        });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async (msg) => {
            const elapsed = (Date.now() - startTime) / 1000;
            const typed = msg.content.toLowerCase().trim();
            const correct = typed === sentence;
            const words = sentence.split(' ').length;
            const wpm = Math.round((words / elapsed) * 60);
            const accuracy = correct ? 100 : Math.round((Levenshtein(sentence, typed) / sentence.length) * 100);

            await msg.reply({
                embeds: [createEmbed({
                    color: correct ? 0x00d26a : 0xffa502,
                    title: 'Typing Test Results',
                    fields: [
                        { name: 'Time', value: `${elapsed.toFixed(2)}s`, inline: true },
                        { name: 'WPM', value: `${wpm}`, inline: true },
                        { name: 'Accuracy', value: `${accuracy}%`, inline: true },
                        { name: 'Correct', value: correct ? 'Yes ✅' : 'No ❌', inline: true }
                    ]
                })]
            });
        });
    }
};

function Levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}
