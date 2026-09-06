const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'seticon', description: 'Set server icon', usage: ',seticon [image URL]' },
    aliases: ['servericon'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const url = args[0];
        if (!url) return message.reply({ embeds: [errorEmbed('Missing URL', 'Usage: ,seticon [image URL]')] });
        try {
            const res = await fetch(url);
            const buffer = Buffer.from(await res.arrayBuffer());
            await message.guild.setIcon(buffer);
            return message.reply({ embeds: [successEmbed('Icon Set', 'Server icon updated!')] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not set icon.')] }); }
    }
};
