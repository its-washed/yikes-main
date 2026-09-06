const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'clone',
        description: 'Clone a channel',
        usage: ',clone [#channel]'
    },
    aliases: ['copychannel'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        try {
            const cloned = await channel.clone({
                reason: `Cloned by ${message.author.tag}`
            });

            await cloned.setPosition(channel.position + 1);

            return message.reply({ embeds: [successEmbed('Channel Cloned', `Created ${cloned} as a copy of ${channel}.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
