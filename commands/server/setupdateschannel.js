const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setupdateschannel', description: 'Set updates channel', usage: ',setupdateschannel [#channel]' },
    aliases: ['updateschannel', 'setupdates'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,setupdateschannel [#channel]')] });
        try {
            await message.guild.setUpdatesChannel(channel);
            return message.reply({ embeds: [successEmbed('Updates Channel', `Updates channel set to ${channel}.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set updates channel.')] }); }
    }
};
