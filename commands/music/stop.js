const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'stop',
        description: 'Stop music and leave voice',
        usage: ',stop'
    },
    aliases: ['disconnect', 'dc', 'leave', 'pause'],
    cooldown: 5,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'I am not playing anything.')] });
        }

        try {
            if (server.connection) server.connection.destroy();
        } catch {}

        servers.delete(message.guild.id);

        return message.reply({ embeds: [successEmbed('Stopped', 'Music stopped and left the voice channel.')] });
    }
};
