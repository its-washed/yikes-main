const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roles', description: 'List server roles', usage: ',roles' },
    aliases: ['rolelist'],
    cooldown: 5,
    async execute(message) {
        const g = message.guild;
        await g.members.fetch();

        const roles = g.roles.cache
            .filter(r => r.id !== g.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} — ${r.members.size} members`);

        if (!roles.length) return message.reply({ embeds: [errorEmbed('No Roles', 'This server has no roles.')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Roles — ${g.name} (${roles.length})`,
                description: roles.join('\n').slice(0, 4000)
            })]
        });
    }
};
