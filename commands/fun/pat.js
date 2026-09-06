const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'pat',
        description: 'Pat someone',
        usage: ',pat [@user]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,pat [@user]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Pat!',
                description: `${message.author} pats ${target}! 🥺`
            })]
        });
    }
};
