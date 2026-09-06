const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'shuffle',
        description: 'Shuffle the music queue',
        usage: ',shuffle'
    },
    aliases: ['sh'],
    cooldown: 5,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server || server.queue.length <= 1) {
            return message.reply({ embeds: [errorEmbed('Not Enough Songs', 'Need at least 2 songs to shuffle.')] });
        }

        const current = server.queue[0];
        const rest = server.queue.slice(1);

        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }

        server.queue = [current, ...rest];

        return message.reply({ embeds: [successEmbed('Shuffled', `Shuffled **${rest.length}** song(s) in the queue.`)] });
    }
};
