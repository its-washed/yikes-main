const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'banall', description: 'Ban all bots in the server', usage: ',banall' },
    aliases: ['banbots'],
    cooldown: 120,
    async execute(message) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator.')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Banning all bots...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (member.user.bot && member.id !== message.client.user.id) {
                try { await member.ban('Auto ban bots'); count++; } catch {}
            }
        }
        return msg.edit({ embeds: [successEmbed('Ban All Bots', `Banned **${count}** bots.`)] });
    }
};
