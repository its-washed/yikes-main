const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'slap',
        description: 'Slap someone',
        usage: ',slap @user'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Who do you want to slap?' })] });
        }

        if (target.id === message.author.id) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: `${message.author} slaps themselves... why? 👋😳` })] });
        }

        return message.reply({
            embeds: [createEmbed({ color: 0xff4757, description: `${message.author} slaps ${target}! 👋😤` })]
        });
    }
};
