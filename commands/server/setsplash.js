const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setsplash', description: 'Set server splash', usage: ',setsplash [image URL]' },
    aliases: [],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        const url = args[0];
        if (!url) return message.reply({ embeds: [errorEmbed('Missing URL', 'Usage: ,setsplash [image URL]')] });
        try {
            const res = await fetch(url);
            const buffer = Buffer.from(await res.arrayBuffer());
            await message.guild.setSplash(buffer);
            return message.reply({ embeds: [successEmbed('Splash Set', 'Server splash updated!')] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set splash. Requires boost level 2+.')] }); }
    }
};
