const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'nowplaying',
        description: 'Show currently playing song',
        usage: ',nowplaying'
    },
    aliases: ['np', 'current'],
    cooldown: 3,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server || server.queue.length === 0) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'Nothing is currently playing.')] });
        }

        const current = server.queue[0];

        return message.reply({
            embeds: [createEmbed({
                color: 0x00d26a,
                title: 'Now Playing',
                description: `**${current.title}**\nRequested by ${current.requestedBy}\n\nQueue: ${server.queue.length - 1} song(s) remaining`
            })]
        });
    }
};
