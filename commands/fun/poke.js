const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'poke',
        description: 'Poke someone',
        usage: ',poke @user'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply({ embeds: [createEmbed({ color: 0x74b9ff, description: 'Who do you want to poke?' })] });
        }

        return message.reply({
            embeds: [createEmbed({ color: 0x74b9ff, description: `${message.author} pokes ${target}! *poke poke* 👉` })]
        });
    }
};
