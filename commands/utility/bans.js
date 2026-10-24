const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'bans', description: 'List banned users', usage: ',bans' },
    aliases: ['banlist'],
    cooldown: 10,
    async execute(message) {
        if (!hasPermission(message.member, 'BanMembers')) return message.reply({ embeds: [permissionDenied(message, 'ban_members')] });
        const bans = await message.guild.bans.fetch();
        if (bans.size === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, description: 'No banned users.' })] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Bans (${bans.size})`, description: bans.map(b => `${b.user.tag} — ${b.reason || 'None provided'}`).join('\n').slice(0, 2000) })] });
    }
};
