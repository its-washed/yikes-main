const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'roleall',
        description: 'Give a role to all members',
        usage: ',roleall [@role]'
    },
    aliases: ['allrole'],
    cooldown: 120,

    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,roleall [@role]')] });

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: `Giving **${role.name}** to all members... This may take a while.` })] });

        let count = 0;
        const members = await message.guild.members.fetch();

        for (const [, member] of members) {
            if (!member.roles.cache.has(role.id)) {
                try {
                    await member.roles.add(role);
                    count++;
                } catch {}
            }
        }

        return msg.edit({ embeds: [createEmbed({ color: 0x22c55e, title: 'Role All Complete', description: `Gave **${role.name}** to **${count}** members.` })] });
    }
};
