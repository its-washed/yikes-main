const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'vanity', description: 'Set vanity URL (requires boost level 3)', usage: ',vanity [code]' },
    aliases: ['setvanity'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const code = args[0];
        if (!code) return message.reply({ embeds: [errorEmbed('Missing Code', 'Usage: ,vanity [code]')] });
        try {
            await message.guild.setVanityURL(code);
            return message.reply({ embeds: [successEmbed('Vanity URL', `Set vanity to **discord.gg/${code}**.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set vanity. Requires boost level 3 and partner status.')] }); }
    }
};
