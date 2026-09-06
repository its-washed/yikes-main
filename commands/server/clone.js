const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'clone',
        description: 'Clone a channel',
        usage: ',clone [channel]'
    },
    aliases: ['clonechannel'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        try {
            const newChannel = await channel.clone();
            return message.reply({ embeds: [successEmbed('Channel Cloned', `Cloned **${channel.name}** to **${newChannel.name}**.`)] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not clone the channel.')] });
        }
    }
};
