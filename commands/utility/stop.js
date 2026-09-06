const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'stop',
        description: 'Stop music and clear queue',
        usage: ',stop'
    },
    aliases: ['disconnect', 'dc', 'leave'],
    cooldown: 5,

    async execute(message) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });
        }

        return message.reply({
            embeds: [successEmbed('Stopped', 'Music stopped and queue cleared.')]
        });
    }
};
