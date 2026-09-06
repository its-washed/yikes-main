const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'deletechannel', description: 'Delete a channel', usage: ',deletechannel [#channel]' },
    aliases: ['delchannel'],
    cooldown: 10,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,deletechannel [#channel]')] });
        const name = channel.name;
        await channel.delete();
        return message.reply({ embeds: [successEmbed('Channel Deleted', `Deleted **#${name}**.`)] });
    }
};
