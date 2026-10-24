const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'lockchannel', description: 'Lock a specific channel', usage: ',lockchannel [#channel]' },
    aliases: ['lc'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [permissionDenied(message, 'manage_channels')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply({ embeds: [successEmbed('Locked', `Locked **${channel.name}**.`)] });
    }
};
