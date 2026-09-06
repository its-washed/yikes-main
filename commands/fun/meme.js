const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'meme',
        description: 'Get a random meme',
        usage: ',meme'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        try {
            const response = await fetch('https://meme-api.com/gimme');
            const data = await response.json();

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: data.title || 'Random Meme',
                    image: { url: data.url },
                    footer: { text: `👍 ${data.ups || 0} | From r/${data.subreddit || 'memes'}` }
                })]
            });
        } catch {
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Random Meme',
                    description: 'Could not fetch a meme right now. Try again later!'
                })]
            });
        }
    }
};
