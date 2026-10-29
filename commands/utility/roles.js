const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'roles', description: "View all roles in the server", usage: ',roles' },
    aliases: [],
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
                color: 0x729bb0,
                title: `Roles — ${g.name} (${roles.length})`,
                description: roles.join('\n').slice(0, 4000)
            })]
        });
    }
};
