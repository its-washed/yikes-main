const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'lockchannel', description: 'Lock a specific channel', usage: ',lockchannel [#channel]' },
    aliases: ['lc'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply({ embeds: [successEmbed('Locked', `Locked **${channel.name}**.`)] });
    }
};
