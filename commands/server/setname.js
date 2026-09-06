const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setname', description: 'Set server name', usage: ',setname [name]' },
    aliases: ['servername'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const name = args.join(' ');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,setname [name]')] });
        try {
            await message.guild.setName(name);
            return message.reply({ embeds: [successEmbed('Name Set', `Server name changed to **${name}**.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set name.')] }); }
    }
};
