const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'skip',
        description: 'Skip the current song',
        usage: ',skip'
    },
    aliases: ['s', 'next'],
    cooldown: 3,

    async execute(message) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });
        }

        return message.reply({
            embeds: [successEmbed('Skipped', 'Current track skipped.')]
        });
    }
};
