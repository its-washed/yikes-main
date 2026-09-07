const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'hug', description: 'Hug someone', usage: ',hug @user' },
    aliases: ['pat'],
    cooldown: 3,
    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [{ color: 0xff4757, description: 'Mention someone to hug.' }] });

        const gifs = [
            'https://media.giphy.com/media/l4FGI2HnlKMvBOMaA/giphy.gif',
            'https://media.giphy.com/media/5O1pisEw8oJYc/giphy.gif',
            'https://media.giphy.com/media/JjECOutfVaQ4g/giphy.gif',
            'https://media.giphy.com/media/KZ20tGmUBbM52/giphy.gif'
        ];
        const gif = gifs[Math.floor(Math.random() * gifs.length)];

        return message.reply({
            embeds: [createEmbed({
                color: 0xff6b81,
                description: `**${message.author.username}** hugs **${target.username}**!`,
                image: { url: gif }
            })]
        });
    }
};
