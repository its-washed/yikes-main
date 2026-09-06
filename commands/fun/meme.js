const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'meme',
        description: 'Get a random meme',
        usage: ',meme'
    },
    aliases: ['randommeme'],
    cooldown: 5,

    async execute(message) {
        const memes = [
            'https://i.imgur.com/5bQhZ7r.jpg',
            'https://i.imgur.com/3v8zKxN.jpg',
            'https://i.imgur.com/8XbDf9k.jpg'
        ];

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Random Meme',
                image: { url: memes[Math.floor(Math.random() * memes.length)] }
            })]
        });
    }
};
