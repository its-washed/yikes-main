const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setboostmsg', description: 'Set boost message channel', usage: ',setboostmsg [#channel]' },
    aliases: ['boostmsg'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,setboostmsg [#channel]')] });
        try {
            await message.guild.setSystemChannel(channel);
            return message.reply({ embeds: [successEmbed('Boost Message', `Boost message channel set to ${channel}.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set boost message channel.')] }); }
    }
};
