const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { servers } = require('./play');

module.exports = {
    data: {
        name: 'bass',
        description: 'Toggle bass boost',
        usage: ',bass'
    },
    aliases: ['bassboost'],
    cooldown: 5,

    async execute(message) {
        const server = servers.get(message.guild.id);
        if (!server) {
            return message.reply({ embeds: [errorEmbed('Nothing Playing', 'I am not playing anything.')] });
        }

        server.bassBoost = !server.bassBoost;

        return message.reply({
            embeds: [createEmbed({
                color: server.bassBoost ? 0x00d26a : 0xff4757,
                title: 'Bass Boost',
                description: server.bassBoost ? 'Bass boost **enabled** 🔊' : 'Bass boost **disabled**'
            })]
        });
    }
};
