const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'joke',
        description: 'Get a random joke',
        usage: ',joke'
    },
    aliases: ['randomjoke'],
    cooldown: 5,

    async execute(message) {
        const jokes = [
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'Why did the scarecrow win an award? He was outstanding in his field!',
            'What do you call a fake noodle? An impasta!',
            'Why don\'t eggs tell jokes? They\'d crack each other up!',
            'I told my wife she was drawing her eyebrows too high. She looked surprised.'
        ];

        return message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Joke', description: jokes[Math.floor(Math.random() * jokes.length)] })]
        });
    }
};
