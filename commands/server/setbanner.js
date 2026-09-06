const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'setbanner', description: 'Set server banner', usage: ',setbanner [image URL]' },
    aliases: ['serverbanner'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const url = args[0];
        if (!url) return message.reply({ embeds: [errorEmbed('Missing URL', 'Usage: ,setbanner [image URL]')] });
        try {
            const res = await fetch(url);
            const buffer = Buffer.from(await res.arrayBuffer());
            await message.guild.setBanner(buffer);
            return message.reply({ embeds: [successEmbed('Banner Set', 'Server banner updated!')] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set banner. Requires boost level 2+.')] }); }
    }
};
