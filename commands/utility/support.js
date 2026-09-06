const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'support',
        description: 'Get support server link',
        usage: ',support'
    },
    aliases: ['supportserver'],
    cooldown: 5,

    async execute(message) {
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Support Server',
                description: '[Join our support server](https://discord.gg/yikes)'
            })]
        });
    }
};
