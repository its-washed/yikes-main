const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'volume',
        description: 'Set the music volume',
        usage: ',volume [1-100]'
    },
    aliases: ['vol'],
    cooldown: 3,

    async execute(message, args) {
        const server = servers.get(message.guild.id);
        if (!server) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'I am not playing anything.')] });
        }

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 1 || vol > 100) {
            return message.reply({ embeds: [errorEmbed('Invalid Volume', 'Volume must be between 1 and 100.')] });
        }

        server.player.state.volume = vol / 100;

        return message.reply({ embeds: [successEmbed('Volume', `Volume set to **${vol}%**.`)] });
    }
};
