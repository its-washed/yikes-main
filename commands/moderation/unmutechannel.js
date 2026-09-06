const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'unmutechannel', description: 'Unmute a text channel', usage: ',unmutechannel [#channel]' },
    aliases: ['umch'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true, AddReactions: true });
        return message.reply({ embeds: [successEmbed('Unmuted Channel', `Unmuted **${channel.name}**.`)] });
    }
};
