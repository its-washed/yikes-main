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

        if (server.stay247) {
            server.queue = [];
            server.skipRequested = false;
            server.playing = false;
            try { server.player.stop(true); } catch {}
            try { server.currentStream?.destroy(); } catch {}
            server.currentStream = null;
            return message.reply({ embeds: [successEmbed('Stopped', 'Music stopped — 24/7 is on, so I am staying in voice.')] });
        }

        try {
            if (server.connection) server.connection.destroy();
        } catch {}

        servers.delete(message.guild.id);
        try { server.player.stop(true); } catch {}
        try { server.currentStream?.destroy(); } catch {}

        return message.reply({ embeds: [successEmbed('Stopped', 'Music stopped and left the voice channel.')] });
    }
};
