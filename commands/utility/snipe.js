const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

module.exports = {
    data: {
        name: 'snipe',
        description: "Snipe the latest message that was deleted",
        usage: ',snipe'
    },
    aliases: ['s'],
    cooldown: 5,

    async execute(message) {
        const channel = message.channel;
        const snipes = message.client.snipes || {};

        if (!snipes[channel.id]) {
            return warn(message, 'No snipes found in this channel');
        }

        const snipe = snipes[channel.id];

        return message.reply({
            embeds: [createEmbed({
                color: 0x729bb0,
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
