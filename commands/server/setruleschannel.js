const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setruleschannel', description: 'Set rules channel', usage: ',setruleschannel [#channel]' },
    aliases: ['ruleschannel'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,setruleschannel [#channel]')] });
        try {
            await message.guild.setRulesChannel(channel);
            return message.reply({ embeds: [successEmbed('Rules Channel', `Rules channel set to ${channel}.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set rules channel.')] }); }
    }
};
