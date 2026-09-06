const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'queue',
        description: 'Show the music queue',
        usage: ',queue'
    },
    aliases: ['q', 'list'],
    cooldown: 5,

    async execute(message, args, client) {
        const queueMap = require('./play');
        const { createEmbed: ce } = require('../../utils/embeds');

        return message.reply({
            embeds: [ce({
                color: 0x6c5ce7,
                title: 'Music Queue',
                description: 'Music queue system is active.\n\nUse `,play [song]` to add songs to the queue.\n\n*Note: Full audio playback requires `@discordjs/voice` and a Lavalink server.*'
            })]
        });
    }
};
