const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'poke',
        description: 'Poke someone',
        usage: ',poke [@user]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,poke [@user]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Poke!',
                description: `${message.author} pokes ${target}! 👉`
            })]
        });
    }
};
