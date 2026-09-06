const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'kickall', description: 'Kick all non-mod members', usage: ',kickall' },
    aliases: [],
    cooldown: 120,
    async execute(message) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator.')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Kicking all non-mod members...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (member.id === message.author.id) continue;
            if (member.permissions.any(['KickMembers', 'BanMembers', 'ManageMessages', 'Administrator'])) continue;
            if (member.user.bot) continue;
            try { await member.kick('Mass kick'); count++; } catch {}
        }
        return msg.edit({ embeds: [successEmbed('Kick All', `Kicked **${count}** members.`)] });
    }
};
