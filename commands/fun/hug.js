const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'hug',
        description: 'Hug someone',
        usage: ',hug [@user]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,hug [@user]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xec4899,
                title: 'Hug!',
                description: `${message.author} hugs ${target}! 🤗`
            })]
        });
    }
};
