const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'unmutechannel', description: 'Unmute a text channel', usage: ',unmutechannel [#channel]' },
    aliases: ['umch'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true, AddReactions: true });
        return message.reply({ embeds: [successEmbed('Unmuted Channel', `Unmuted **${channel.name}**.`)] });
    }
};
