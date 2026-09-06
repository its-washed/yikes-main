const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'loop',
        description: 'Toggle loop mode',
        usage: ',loop [off|song|queue]'
    },
    aliases: ['repeat'],
    cooldown: 5,

    async execute(message, args) {
        const server = servers.get(message.guild.id);
        if (!server) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'I am not playing anything.')] });
        }

        const mode = args[0]?.toLowerCase();
        let newMode;

        if (!mode || mode === 'off') {
            server.loop = null;
            newMode = 'off';
        } else if (mode === 'song' || mode === 's') {
            server.loop = 'song';
            newMode = 'song';
        } else if (mode === 'queue' || mode === 'q') {
            server.loop = 'queue';
            newMode = 'queue';
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Mode', 'Use `off`, `song`, or `queue`.')] });
        }

        return message.reply({ embeds: [successEmbed('Loop', `Loop mode set to **${newMode}**.`)] });
    }
};
