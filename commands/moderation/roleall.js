const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'roleall', description: 'Give role to all members', usage: ',roleall [@role]' },
    aliases: [],
    cooldown: 300,
    async execute(message, args) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,roleall [@role]')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Adding role to all members...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (!member.roles.cache.has(role.id)) {
                try { await member.roles.add(role); count++; } catch {}
            }
        }
        return msg.edit({ embeds: [createEmbed({ color: 0x22c55e, description: `Added **${role.name}** to **${count}** members.` })] });
    }
};
