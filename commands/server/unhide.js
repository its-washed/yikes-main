const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'unhide',
        description: 'Unhide a channel',
        usage: ',unhide [channel]'
    },
    aliases: ['unhidechannel'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });

        return message.reply({ embeds: [successEmbed('Channel Unhidden', `Unhidden **${channel.name}** for everyone.`)] });
    }
};
