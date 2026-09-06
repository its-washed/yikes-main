const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'support',
        description: 'Get support server link',
        usage: ',support'
    },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Support Server',
                description: 'Need help? Join our support server!\n\n[Click here to join](https://discord.gg/yikes)'
            })]
        });
    }
};
