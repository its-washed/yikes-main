const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'snipe',
        description: 'Snipe the last deleted message',
        usage: ',snipe'
    },
    aliases: ['deletesnipe'],
    cooldown: 5,

    async execute(message) {
        const channel = message.channel;
        const snipes = message.client.snipes || {};

        if (!snipes[channel.id]) {
            return message.reply({ embeds: [errorEmbed('Nothing to Snipe', 'No deleted messages found.')] });
        }

        const snipe = snipes[channel.id];

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Sniped Message',
                author: { name: snipe.author, iconURL: snipe.avatar },
                description: snipe.content || '*No text content*',
                image: snipe.image ? { url: snipe.image } : undefined,
                footer: { text: `Deleted ${snipe.time}` },
                timestamp: snipe.timestamp
            })]
        });
    }
};
