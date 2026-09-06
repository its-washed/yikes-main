const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'massroleadd', description: 'Add role to all members', usage: ',massroleadd [@role]' },
    aliases: ['mra'],
    cooldown: 300,
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,massroleadd [@role]')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Adding role to all members...' })] });
        let count = 0;
        const members = await message.guild.members.fetch();
        for (const [, member] of members) {
            if (!member.roles.cache.has(role.id)) {
                try { await member.roles.add(role); count++; } catch {}
            }
        }
        return msg.edit({ embeds: [successEmbed('Mass Role Add', `Added **${role.name}** to **${count}** members.`)] });
    }
};
