const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'nuke',
        description: 'Nuke a channel (clone and delete)',
        usage: ',nuke [channel]'
    },
    aliases: ['clone'],
    cooldown: 30,

    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        const newChannel = await channel.clone();
        await channel.delete();

        await newChannel.send({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Channel Nuked',
                description: `Nuked by ${message.author.tag}`,
                image: { url: 'https://media.tenor.com/images/nuke-explosion.gif' }
            })]
        });
    }
};
