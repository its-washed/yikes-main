const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'urban', description: "Gets the definition of a word/slang from Urban Dictionary", usage: ',urban <word>' },
    aliases: ['define'],
    cooldown: 5,
    async execute(message, args) {
        const word = args.join(' ');
        if (!word) return message.reply({ embeds: [errorEmbed('Usage', ',urban <word>')] });

        try {
            const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
            const data = await res.json();
            if (!data.list?.length) return message.reply({ embeds: [errorEmbed('Not Found', `No definition found for **${word}**`)] });

            const def = data.list[0];
            const written = def.written_on ? new Date(def.written_on) : null;
            return message.reply({
                embeds: [createEmbed({
                    color: 0x729bb0,
                    title: def.word,
                    url: def.permalink,
                    description: def.definition?.slice(0, 2000) || 'No definition.',
                    timestamp: written && !isNaN(written.getTime()) ? written.getTime() : undefined,
                    fields: [
                        { name: 'Example', value: def.example?.slice(0, 1000) || 'No example provided.', inline: false },
                        { name: '👍', value: `${def.thumbs_up}`, inline: true },
                        { name: '👎', value: `${def.thumbs_down}`, inline: true }
                    ]
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch definition.')] });
        }
    }
};
