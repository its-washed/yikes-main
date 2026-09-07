const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'meme', description: 'Get a random meme', usage: ',meme' },
    cooldown: 5,
    async execute(message) {
        try {
            const res = await fetch('https://meme-api.com/gimme');
            const data = await res.json();
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: data.title || 'Meme',
                    image: { url: data.url },
                    footer: { text: `👍 ${data.ups || 0}` }
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch meme.')] });
        }
    }
};
