const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'nowplaying',
        description: 'Show the currently playing song',
        usage: ',nowplaying'
    },
    aliases: ['np', 'current'],
    cooldown: 3,

    async execute(message) {
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Now Playing',
                description: '*No music playing.*\n\nUse `,play [song]` to start playing.\n\n*Note: Full audio requires `@discordjs/voice` setup.*'
            })]
        });
    }
};
