const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'mutechannel', description: 'Mute everyone in a text channel', usage: ',mutechannel [#channel]' },
    aliases: ['mch'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false, AddReactions: false });
        return message.reply({ embeds: [successEmbed('Muted Channel', `Muted **${channel.name}**.`)] });
    }
};
