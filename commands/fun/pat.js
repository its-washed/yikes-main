const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'pat',
        description: 'Pat someone',
        usage: ',pat @user'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;

        return message.reply({
            embeds: [createEmbed({ color: 0xffeaa7, description: `${message.author} pats ${target} gently on the head! 🥰` })]
        });
    }
};
