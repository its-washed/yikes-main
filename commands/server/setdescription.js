const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setdescription', description: 'Set server description', usage: ',setdescription [text]' },
    aliases: ['setdesc'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,setdescription [text]')] });
        try {
            await message.guild.setDescription(text);
            return message.reply({ embeds: [successEmbed('Description Set', `Server description updated to:\n${text}`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set description.')] }); }
    }
};
