const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'skip',
        description: 'Skip the current song',
        usage: ',skip'
    },
    aliases: ['s', 'next'],
    cooldown: 3,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server || server.queue.length === 0) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'Nothing to skip.')] });
        }

        const skipped = server.queue[0];
        server.player.stop();

        return message.reply({ embeds: [successEmbed('Skipped', `Skipped **${skipped.title}**.`)] });
    }
};
