const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'define', description: 'Define a word', usage: ',define <word>' },
    aliases: ['dictionary'],
    cooldown: 5,
    async execute(message, args) {
        const word = args[0];
        if (!word) return message.reply({ embeds: [errorEmbed('Usage', ',define <word>')] });

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = await res.json();
            if (!data || !data[0]) return message.reply({ embeds: [errorEmbed('Not Found', 'No definition found.')] });

            const entry = data[0];
            const defs = entry.meanings.slice(0, 3).map(m => `**${m.partOfSpeech}:** ${m.definitions[0].definition}`).join('\n\n');

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: entry.word,
                    description: defs,
                    footer: { text: 'Source: Free Dictionary API' }
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not look up word.')] });
        }
    }
};
