const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'slap',
        description: 'Slap someone',
        usage: ',slap [@user]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,slap [@user]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Slap!',
                description: `${message.author} slaps ${target}! 👋`
            })]
        });
    }
};
