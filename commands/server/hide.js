const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'hide',
        description: 'Hide a channel from everyone',
        usage: ',hide [channel]'
    },
    aliases: ['hidechannel'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });

        return message.reply({ embeds: [successEmbed('Channel Hidden', `Hidden **${channel.name}** from everyone.`)] });
    }
};
