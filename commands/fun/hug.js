const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'hug',
        description: 'Hug someone',
        usage: ',hug @user'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const sender = message.author;

        if (target.id === sender.id) {
            return message.reply({ embeds: [createEmbed({ color: 0xff6b81, description: `${sender} hugs themselves... you okay? 🫂` })] });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0xff6b81,
                description: `${sender} hugs ${target}! 🫂💕`
            })]
        });
    }
};
