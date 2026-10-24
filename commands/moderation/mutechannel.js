const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'mutechannel', description: 'Mute everyone in a text channel', usage: ',mutechannel [#channel]' },
    aliases: ['mch'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false, AddReactions: false });
        return message.reply({ embeds: [successEmbed('Muted Channel', `Muted **${channel.name}**.`)] });
    }
};
