const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'unlockchannel', description: 'Unlock a specific channel', usage: ',unlockchannel [#channel]' },
    aliases: ['ulc'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        return message.reply({ embeds: [successEmbed('Unlocked', `Unlocked **${channel.name}**.`)] });
    }
};
