const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'urban', description: 'Urban Dictionary lookup', usage: ',urban <word>' },
    cooldown: 5,
    async execute(message, args) {
        const word = args.join(' ');
        if (!word) return message.reply({ embeds: [errorEmbed('Usage', ',urban <word>')] });

        try {
            const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
            const data = await res.json();
            if (!data.list?.length) return message.reply({ embeds: [errorEmbed('Not Found', 'No definition found.')] });

            const def = data.list[0];
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: def.word,
                    url: def.permalink,
                    description: def.definition?.slice(0, 2000) || 'No definition.',
                    fields: [
                        { name: 'Example', value: def.example?.slice(0, 1000) || 'None', inline: false },
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
