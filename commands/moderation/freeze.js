const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'freeze',
        description: 'Freeze a channel (only admins can send)',
        usage: ',freeze [channel]'
    },
    aliases: ['freezechannel'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels permission.')] });
        }

        const channel = message.mentions.channels.first() || message.channel;

        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        await channel.permissionOverwrites.edit(message.guild.roles.cache.find(r => r.name === 'Admin') || message.guild.roles.everyone, { SendMessages: true });

        return message.reply({ embeds: [createEmbed({ color: 0x06b6d4, title: 'Channel Frozen', description: `Frozen **${channel.name}**. Only admins can send messages.` })] });
    }
};
