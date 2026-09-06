const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'unfreeze',
        description: 'Unfreeze a channel',
        usage: ',unfreeze [channel]'
    },
    aliases: ['unfreezechannel'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Channel Unfrozen', description: `Unfrozen **${channel.name}**.` })] });
    }
};
