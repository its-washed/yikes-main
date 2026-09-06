const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'massroleremove', description: 'Remove role from all members', usage: ',massroleremove [@role]' },
    aliases: ['mrr'],
    cooldown: 300,
    async execute(message, args) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,massroleremove [@role]')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Removing role from all members...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (member.roles.cache.has(role.id)) {
                try { await member.roles.remove(role); count++; } catch {}
            }
        }
        return msg.edit({ embeds: [successEmbed('Mass Role Remove', `Removed **${role.name}** from **${count}** members.`)] });
    }
};
