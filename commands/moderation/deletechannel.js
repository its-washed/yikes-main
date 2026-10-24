const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'deletechannel', description: 'Delete a channel', usage: ',deletechannel [#channel]' },
    aliases: ['delchannel'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,deletechannel [#channel]')] });
        const name = channel.name;
        await channel.delete();
        return message.reply({ embeds: [successEmbed('Channel Deleted', `Deleted **#${name}**.`)] });
    }
};
