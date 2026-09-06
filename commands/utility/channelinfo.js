const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'channelinfo', description: 'Get channel info', usage: ',channelinfo [#channel]' },
    aliases: ['ci', 'channel'],
    cooldown: 3,
    async execute(message, args) {
        const channel = message.mentions.channels.first() || message.channel;
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7, title: `#${channel.name}`,
                fields: [
                    { name: 'Type', value: `${channel.type}`, inline: true },
                    { name: 'ID', value: channel.id, inline: true },
                    { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true },
                    { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
                    { name: 'Topic', value: channel.topic || 'None', inline: false }
                ]
            })]
        });
    }
};
