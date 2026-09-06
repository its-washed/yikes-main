const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'archivechannel', description: 'Archive a channel by moving to bottom and locking', usage: ',archivechannel [#channel]' },
    aliases: ['archive'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        await channel.setPosition(0);
        return message.reply({ embeds: [successEmbed('Archived', `Archived **${channel.name}**.`)] });
    }
};
